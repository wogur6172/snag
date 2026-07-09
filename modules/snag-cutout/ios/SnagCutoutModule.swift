import CoreImage
import ExpoModulesCore
import ImageIO
import UIKit
import Vision

internal struct SnagManualCutoutPoint: Record {
  @Field
  var size: Double = 0

  @Field
  var x: Double = 0

  @Field
  var y: Double = 0
}

public final class SnagCutoutModule: Module {
  private let ciContext = CIContext(options: [.cacheIntermediates: false])

  public func definition() -> ModuleDefinition {
    Name("SnagCutout")

    AsyncFunction("isSupportedAsync") { () -> Bool in
      if #available(iOS 17.0, *) {
        return true
      }
      return false
    }

    AsyncFunction("cutoutImageAsync") { (uri: String) -> [String: Any] in
      if #available(iOS 17.0, *) {
        return try self.cutoutImage(uri: uri)
      }
      throw SnagCutoutUnsupportedException()
    }

    AsyncFunction("applyManualCutoutAsync") { (uri: String, points: [SnagManualCutoutPoint]) -> [String: Any] in
      return try self.applyManualCutout(uri: uri, points: points)
    }
  }

  @available(iOS 17.0, *)
  private func cutoutImage(uri: String) throws -> [String: Any] {
    let inputURL = try url(from: uri)
    let orientation = imageOrientation(for: inputURL)
    let requestHandler = VNImageRequestHandler(url: inputURL, orientation: orientation, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()

    try requestHandler.perform([request])

    guard let observation = request.results?.first else {
      throw SnagCutoutEmptyResultException()
    }

    let maskedBuffer: CVPixelBuffer
    do {
      maskedBuffer = try observation.generateMaskedImage(
        ofInstances: observation.allInstances,
        from: requestHandler,
        croppedToInstancesExtent: true
      )
    } catch {
      throw SnagCutoutVisionException(error.localizedDescription)
    }

    let outputURL = try outputFileURL()
    let image = CIImage(cvPixelBuffer: maskedBuffer)
    let colorSpace = CGColorSpaceCreateDeviceRGB()

    do {
      try ciContext.writePNGRepresentation(
        of: image,
        to: outputURL,
        format: .RGBA8,
        colorSpace: colorSpace
      )
    } catch {
      throw SnagCutoutWriteException(error.localizedDescription)
    }

    return [
      "uri": outputURL.absoluteString,
      "width": Int(image.extent.width),
      "height": Int(image.extent.height)
    ]
  }

  private func applyManualCutout(uri: String, points: [SnagManualCutoutPoint]) throws -> [String: Any] {
    let inputURL = try url(from: uri)
    let image = try loadImage(from: inputURL, originalURI: uri)

    let renderSize = image.size
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = false

    let renderer = UIGraphicsImageRenderer(size: renderSize, format: format)
    let outputImage = renderer.image { context in
      image.draw(in: CGRect(origin: .zero, size: renderSize))

      let cgContext = context.cgContext
      cgContext.setBlendMode(.clear)
      cgContext.setFillColor(UIColor.clear.cgColor)

      let minSide = min(renderSize.width, renderSize.height)
      points.forEach { point in
        let diameter = max(point.size * minSide, 1)
        let centerX = point.x * renderSize.width
        let centerY = point.y * renderSize.height
        let rect = CGRect(
          x: centerX - diameter / 2,
          y: centerY - diameter / 2,
          width: diameter,
          height: diameter
        )
        cgContext.fillEllipse(in: rect)
      }
    }

    guard let pngData = outputImage.pngData() else {
      throw SnagCutoutWriteException("Could not encode manual cutout PNG.")
    }

    let outputURL = try outputFileURL()

    do {
      try pngData.write(to: outputURL, options: [.atomic])
    } catch {
      throw SnagCutoutWriteException(error.localizedDescription)
    }

    return [
      "uri": outputURL.absoluteString,
      "width": Int(outputImage.size.width),
      "height": Int(outputImage.size.height)
    ]
  }

  private func loadImage(from url: URL, originalURI: String) throws -> UIImage {
    if url.isFileURL, let image = UIImage(contentsOfFile: url.path) {
      return image
    }

    do {
      let data = try Data(contentsOf: url)
      if let image = UIImage(data: data) {
        return image
      }
    } catch {
      throw SnagCutoutInvalidURIException(originalURI)
    }

    throw SnagCutoutInvalidURIException(originalURI)
  }

  private func url(from uri: String) throws -> URL {
    if uri.hasPrefix("file://"), let url = URL(string: uri) {
      return url
    }

    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }

    throw SnagCutoutInvalidURIException(uri)
  }

  private func imageOrientation(for url: URL) -> CGImagePropertyOrientation {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let rawOrientation = properties[kCGImagePropertyOrientation] as? UInt32,
          let orientation = CGImagePropertyOrientation(rawValue: rawOrientation) else {
      return .up
    }

    return orientation
  }

  private func outputFileURL() throws -> URL {
    let cacheDirectory = appContext?.config.cacheDirectory ?? FileManager.default.temporaryDirectory
    let directory = cacheDirectory.appendingPathComponent("SnagCutout", isDirectory: true)

    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    } catch {
      throw SnagCutoutWriteException(error.localizedDescription)
    }

    return directory.appendingPathComponent("\(UUID().uuidString).png")
  }
}

internal final class SnagCutoutUnsupportedException: Exception, @unchecked Sendable {
  override var reason: String {
    "Apple Vision foreground cutout requires iOS 17 or later."
  }
}

internal final class SnagCutoutInvalidURIException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Invalid image URI: \(param)"
  }
}

internal final class SnagCutoutEmptyResultException: Exception, @unchecked Sendable {
  override var reason: String {
    "Vision did not find a foreground subject."
  }
}

internal final class SnagCutoutVisionException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Vision cutout failed: \(param)"
  }
}

internal final class SnagCutoutWriteException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Could not write cutout PNG: \(param)"
  }
}
