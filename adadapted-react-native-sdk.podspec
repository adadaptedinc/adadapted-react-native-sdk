require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "adadapted-react-native-sdk"
  # Strip any prerelease suffix (e.g. the semantic-release placeholder
  # "0.0.0-development"). CocoaPods' default ">= 0" requirement does not match
  # prerelease versions, which breaks local `:path` installs of this pod.
  s.version      = package["version"].split("-").first
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/adadaptedinc/adadapted-react-native-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m}"

  # React Native 0.82+ builds with the New Architecture. Use the standard
  # helper (available inside a RN project's Podfile context) to wire up the
  # correct React dependencies; fall back to React-Core for older setups or
  # standalone spec linting.
  if defined?(install_modules_dependencies)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
