cask "leetcode-tracker" do
  version "1.0.1"

  if Hardware::CPU.arm?
    url "https://github.com/rustamPy/leetcode-tracker/releases/download/v#{version}/LeetCode%20Tracker-#{version}-arm64.dmg"
    sha256 "201ea7a7f8daa46adcd27376b6a7286a4e537ccbe26bf6d207226f8f8c392e23"
  else
    url "https://github.com/rustamPy/leetcode-tracker/releases/download/v#{version}/LeetCode%20Tracker-#{version}-x64.dmg"
    sha256 :no_check  # update with x64 SHA256 after first x64 build
  end

  name "LeetCode Tracker"
  desc "macOS menu bar app to track LeetCode progress and prep for interviews"
  homepage "https://github.com/rustamPy/leetcode-tracker"

  app "LeetCode Tracker.app"

  zap trash: [
    "~/Library/Application Support/leetcode-tracker",
    "~/Library/Preferences/com.rustam.leetcode-tracker.plist",
    "~/Library/Saved Application State/com.rustam.leetcode-tracker.savedState",
  ]
end
