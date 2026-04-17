param(
    [string]$VoiceName = $env:SIGHTLINE_VOICE
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Speech

$outputDir = Join-Path $PSScriptRoot '..\assets\voice-recordings'
$outputDir = [System.IO.Path]::GetFullPath($outputDir)

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$recordings = @(
    @{ Text = 'Walk signal ahead, about 10 feet away. Walk signal is on.'; FileName = 'walk-sign-on-10ft-center.wav' },
    @{ Text = 'Don''t walk signal ahead, about 10 feet away. Wait. Do not cross now.'; FileName = 'walk-sign-off-10ft-center.wav' }
)

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 1
$synth.Volume = 100

$preferredDefaultVoice = 'Microsoft Zira Desktop'

if (-not $VoiceName) {
    $installedVoices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    if ($installedVoices -contains $preferredDefaultVoice) {
        $VoiceName = $preferredDefaultVoice
    }
}

if ($VoiceName) {
    try {
        $synth.SelectVoice($VoiceName)
    }
    catch {
        $available = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
        throw "Voice '$VoiceName' not found. Installed voices: $($available -join ', ')"
    }
}

$selectedVoice = $synth.Voice.Name
Write-Host "Using voice: $selectedVoice"
Write-Host "Tip: set SIGHTLINE_VOICE to force a specific voice profile."

try {
    foreach ($item in $recordings) {
        $targetPath = Join-Path $outputDir $item.FileName
        $synth.SetOutputToWaveFile($targetPath)
        $synth.Speak($item.Text)
        Write-Host "Exported: $targetPath"
    }
}
finally {
    $synth.SetOutputToDefaultAudioDevice()
    $synth.Dispose()
}
