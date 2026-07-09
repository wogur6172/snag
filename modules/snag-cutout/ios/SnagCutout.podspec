require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SnagCutout'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'Snag'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '6.0'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'Vision', 'CoreImage', 'ImageIO', 'UIKit'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
  s.source_files = '**/*.{h,m,swift}'
end
