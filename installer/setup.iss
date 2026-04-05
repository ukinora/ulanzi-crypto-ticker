; Crypto Ticker for Ulanzi D200H - Inno Setup Script
; https://github.com/ukinora/ulanzi-crypto-ticker

#define MyAppName "Crypto Ticker for Ulanzi"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "ukinora"
#define MyAppURL "https://github.com/ukinora/ulanzi-crypto-ticker"
#define PluginFolder "com.ulanzi.cryptoticker.ulanziPlugin"
#define UlanziExe "UlanziDeck.exe"

[Setup]
AppId={{E8A3F1B2-7C4D-4E5F-9A6B-1D2E3F4A5B6C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={userappdata}\Ulanzi\UlanziDeck\Plugins\{#PluginFolder}
DisableProgramGroupPage=yes
DisableDirPage=yes
LicenseFile=..\LICENSE
OutputDir=output
OutputBaseFilename=CryptoTicker-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Files]
Source: "..\manifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\en.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\ko_KR.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\zh_CN.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs
Source: "..\libs\*"; DestDir: "{app}\libs"; Flags: ignoreversion recursesubdirs
Source: "..\plugin\*"; DestDir: "{app}\plugin"; Flags: ignoreversion recursesubdirs
Source: "..\property-inspector\*"; DestDir: "{app}\property-inspector"; Flags: ignoreversion recursesubdirs

[Code]
var
  RestartCheckBox: TNewCheckBox;
  UlanziWasRunning: Boolean;

function FindUlanziPath(): String;
var
  Path: String;
begin
  // Common install locations
  Path := ExpandConstant('{localappdata}') + '\Programs\Ulanzi\UlanziDeck.exe';
  if FileExists(Path) then begin
    Result := Path;
    Exit;
  end;
  Path := ExpandConstant('{pf}') + '\Ulanzi\UlanziDeck.exe';
  if FileExists(Path) then begin
    Result := Path;
    Exit;
  end;
  Path := ExpandConstant('{localappdata}') + '\Ulanzi\UlanziDeck.exe';
  if FileExists(Path) then begin
    Result := Path;
    Exit;
  end;
  Result := '';
end;

function IsUlanziRunning(): Boolean;
var
  WMIQuery: String;
  ResultCode: Integer;
begin
  // Use tasklist to check if process exists
  Exec(ExpandConstant('{sys}\cmd.exe'),
    '/C tasklist /FI "IMAGENAME eq {#UlanziExe}" /NH | findstr /I "{#UlanziExe}"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := (ResultCode = 0);
end;

procedure KillUlanzi();
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'),
    '/F /IM {#UlanziExe}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(1500);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  UlanziWasRunning := IsUlanziRunning();
  if UlanziWasRunning then begin
    if MsgBox('Ulanzi Studio is currently running.' + #13#10 +
              'It must be closed to install the plugin.' + #13#10#13#10 +
              'Close it now?', mbConfirmation, MB_YESNO) = IDYES then
      KillUlanzi()
    else
      Result := 'Please close Ulanzi Studio and try again.';
  end;
end;

procedure UpdateFinishPage(Sender: TWizardPage);
begin
  RestartCheckBox.Visible := (FindUlanziPath() <> '');
end;

procedure CreateRestartCheckBox();
begin
  RestartCheckBox := TNewCheckBox.Create(WizardForm);
  RestartCheckBox.Parent := WizardForm.FinishedPage;
  RestartCheckBox.Left := WizardForm.RunList.Left;
  RestartCheckBox.Top := WizardForm.RunList.Top;
  RestartCheckBox.Width := WizardForm.RunList.Width;
  RestartCheckBox.Height := ScaleY(20);
  RestartCheckBox.Caption := 'Launch Ulanzi Studio';
  RestartCheckBox.Checked := True;
  // Hide default run list
  WizardForm.RunList.Visible := False;
end;

procedure InitializeWizard();
begin
  CreateRestartCheckBox();
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  UlanziPath: String;
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then begin
    if RestartCheckBox.Checked then begin
      UlanziPath := FindUlanziPath();
      if UlanziPath <> '' then
        Exec(UlanziPath, '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);
    end;
  end;
end;

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
