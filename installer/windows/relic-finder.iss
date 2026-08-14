; Relic Finder — Windows installer.
;
; Wraps the application image jpackage produced (a launcher, the jar and a
; Java 25 runtime) into the single .exe a player downloads and runs.
;
; What it does beyond copying files:
;
;   * refuses to install on anything older than Windows 10;
;   * looks for a Java 25 already on the machine and, if it finds one, offers
;     to use it and leave the bundled runtime out of the installation;
;   * puts an entry in the Start menu, and a desktop icon if asked;
;   * closes the application before uninstalling it, and offers to delete the
;     wishlist and the cached prices.
;
; Built by installer\windows\build.ps1, which passes the three defines below.
; Compiling this file on its own will not work.

#ifndef AppVersion
  #error Compile through build.ps1: AppVersion is not defined
#endif
#ifndef AppImage
  #error Compile through build.ps1: AppImage is not defined
#endif
#ifndef OutputDir
  #error Compile through build.ps1: OutputDir is not defined
#endif

#define AppName "Relic Finder"
#define AppExe "RelicFinder.exe"
#define AppPublisher "drakmanga"
#define AppUrl "https://github.com/drakmanga/relicsFinder"

[Setup]
; Never change this: it is how Windows recognises an installed copy, and a new
; value would leave the old one in the installed programs list forever.
AppId={{70F2997E-299D-42A5-8BCF-057EF4D84259}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppUrl}
AppSupportURL={#AppUrl}/issues
AppUpdatesURL={#AppUrl}/releases

; Installs for the current user by default, into their own AppData, which needs
; no administrator rights and raises no prompt from Windows. The dialog still
; offers the machine-wide install to anyone who wants it.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}

; The launcher holds the jar open while it runs, so an install over a running
; copy would fail on a locked file. This asks Windows which processes are in
; the way and offers to close them. The jar is in the filter because the file
; the JVM keeps open is the jar, not the launcher: the default filter of
; executables and libraries would miss it.
CloseApplications=yes
CloseApplicationsFilter=*.exe,*.dll,*.chm,*.jar
RestartApplications=no

; The runtime is a thousand small files, which is what solid compression is
; for: roughly half the size of compressing them one at a time.
Compression=lzma2/max
SolidCompression=yes

; The application image is 64-bit, because the runtime jpackage put in it is.
; "compatible" rather than "os" so it also installs on an ARM machine, where
; Windows runs x64 binaries under emulation and the application is none the
; wiser. Needs Inno Setup 6.3 or later.
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Java 25 has not supported anything older for years, and neither has Warframe.
MinVersion=10.0

WizardStyle=modern
SetupIconFile=relic-finder.ico
OutputDir={#OutputDir}
OutputBaseFilename=RelicFinder-{#AppVersion}-setup

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"

[CustomMessages]
en.JavaCaptionFound=Java was found on this computer
en.JavaCaptionMissing=Java is needed and will be installed
en.JavaHeader=%1 runs on Java 25
en.JavaBodyFound=This computer already has Java %1, in:%n%n%2%n%nUse it, or install the copy included here. Both work. Using the one already installed saves about %3 MB; installing the included copy keeps %4 working even if that Java is later removed.
en.JavaBodyMissing=This computer does not have Java 25 or later.%n%nA copy is included in this installer and will be placed in %1's own folder. Nothing is downloaded, nothing else on this computer is changed, and no other program will see it.%n%nThis adds about %2 MB.
en.JavaUseSystem=Use the Java already installed (saves about %1 MB)
en.JavaUseBundled=Install the included Java runtime (safest choice)
en.CreateDesktopIcon=Create a &desktop icon
en.LaunchApp=Open %1 now
en.RemoveDataText=Your wishlist, the parts marked as owned and the cached prices are kept in:%n%n%1%n%nDelete them?%n%nChoose No to keep them for a later reinstallation. If %2 was installed for every user, only your own copy is affected.
it.JavaCaptionFound=Java è già presente su questo computer
it.JavaCaptionMissing=Java serve e verrà installato
it.JavaHeader=%1 funziona con Java 25
it.JavaBodyFound=Su questo computer c'è già Java %1, in:%n%n%2%n%nPuoi usare quello, oppure installare la copia inclusa qui. Funzionano entrambi. Usare quello già installato risparmia circa %3 MB; installare la copia inclusa fa sì che %4 continui a funzionare anche se quel Java venisse rimosso.
it.JavaBodyMissing=Su questo computer non c'è Java 25 o superiore.%n%nUna copia è inclusa in questo installer e verrà messa nella cartella di %1. Non viene scaricato niente, non viene modificato nient'altro sul computer, e nessun altro programma la vedrà.%n%nOccupa circa %2 MB.
it.JavaUseSystem=Usa il Java già installato (risparmia circa %1 MB)
it.JavaUseBundled=Installa il runtime Java incluso (scelta più sicura)
it.CreateDesktopIcon=Crea un'icona sul &desktop
it.LaunchApp=Apri %1 adesso
it.RemoveDataText=La wishlist, i pezzi segnati come posseduti e i prezzi in cache sono in:%n%n%1%n%nVuoi cancellarli?%n%nScegli No per conservarli in vista di una reinstallazione. Se %2 era installato per tutti gli utenti, viene toccata solo la tua copia.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#AppImage}\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppImage}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs

; Skipped entirely when the user chose the Java already on the machine. The
; files are inside this installer either way — the choice is about what ends up
; on their disk, not about what they download.
Source: "{#AppImage}\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: UseBundledRuntime

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
; nowait, because the launcher does not return: it is the application.
; postinstall leaves it as a tick box on the last page rather than something
; that happens whether or not it was wanted. runasoriginaluser matters for the
; machine-wide install: started elevated, the application would write its
; wishlist into the administrator's AppData instead of the player's.
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchApp,{#AppName}}"; Flags: nowait postinstall skipifsilent runasoriginaluser

[UninstallDelete]
; The launcher's configuration file is edited after installation, and the
; folder holds nothing else worth keeping. The user's lists are not here — they
; are in AppData, and are only removed if asked for, in code below.
Type: filesandordirs; Name: "{app}\app"

; Every file in here was installed and is logged, so this is a net rather
; than the means: it catches anything the runtime wrote next to itself, which
; would otherwise keep the folder alive and produce the "some elements could
; not be removed" ending with no list of what they were.
Type: filesandordirs; Name: "{app}\runtime"

Type: dirifempty; Name: "{app}"

[Code]
const
  { What the bundled runtime costs on disk, near enough to be honest about in a
    sentence. Only ever used in the text of the page. }
  RuntimeMegabytes = 90;

  { The lowest Java the application runs on, which is the release its class
    files were compiled for. }
  RequiredJava = 25;

var
  JavaPage: TInputOptionWizardPage;
  SystemJavaHome: String;
  SystemJavaVersion: Integer;
  Candidates: TArrayOfString;

{ ---------------------------------------------------------------------------
  Finding a Java that is already here.

  There is no one place to look. Every vendor writes its own registry key and
  JAVA_HOME may point anywhere, so the search collects candidate folders from
  all the usual places and then asks the only question that matters of each
  one: is there a JVM in it, and is it new enough.
  --------------------------------------------------------------------------- }

procedure AddCandidate(Home: String);
var
  Count: Integer;
begin
  if Home = '' then
    exit;

  Count := GetArrayLength(Candidates);
  SetArrayLength(Candidates, Count + 1);
  Candidates[Count] := Home;
end;

{ Every value under a vendor's key that could name an installation folder. The
  three names cover Oracle and the OpenJDK builds between them. }
procedure AddCandidatesFromKey(Key: String);
var
  Value: String;
begin
  if RegQueryStringValue(HKLM64, Key, 'JavaHome', Value) then AddCandidate(Value);
  if RegQueryStringValue(HKLM64, Key, 'InstallationPath', Value) then AddCandidate(Value);
  if RegQueryStringValue(HKLM64, Key + '\hotspot\MSI', 'Path', Value) then AddCandidate(Value);
end;

procedure AddCandidatesFromRoot(Root: String);
var
  Names: TArrayOfString;
  I: Integer;
begin
  { Oracle's layout puts the values on the root itself. }
  AddCandidatesFromKey(Root);

  if RegGetSubkeyNames(HKLM64, Root, Names) then
    for I := 0 to GetArrayLength(Names) - 1 do
      AddCandidatesFromKey(Root + '\' + Names[I]);
end;

procedure CollectCandidates;
begin
  SetArrayLength(Candidates, 0);

  { First, because a machine with JAVA_HOME set has an answer to this question
    already and it is the one its owner chose. }
  AddCandidate(GetEnv('JAVA_HOME'));

  AddCandidatesFromRoot('SOFTWARE\JavaSoft\JDK');
  AddCandidatesFromRoot('SOFTWARE\JavaSoft\JRE');
  AddCandidatesFromRoot('SOFTWARE\JavaSoft\Java Development Kit');
  AddCandidatesFromRoot('SOFTWARE\JavaSoft\Java Runtime Environment');
  AddCandidatesFromRoot('SOFTWARE\Eclipse Adoptium\JDK');
  AddCandidatesFromRoot('SOFTWARE\Eclipse Adoptium\JRE');
  AddCandidatesFromRoot('SOFTWARE\Eclipse Foundation\JDK');
  AddCandidatesFromRoot('SOFTWARE\Microsoft\JDK');
  AddCandidatesFromRoot('SOFTWARE\Azul Systems\Zulu');
  AddCandidatesFromRoot('SOFTWARE\BellSoft\Liberica');
  AddCandidatesFromRoot('SOFTWARE\Amazon Corretto');
  AddCandidatesFromRoot('SOFTWARE\Semeru\JDK');
end;

{ The major version out of the release file every JDK and JRE ships, whose
  first line is JAVA_VERSION="25.0.1". Zero when it cannot be read. }
function JavaMajorVersion(Home: String): Integer;
var
  Lines: TArrayOfString;
  I, Dot: Integer;
  Value: String;
begin
  Result := 0;
  if not LoadStringsFromFile(Home + '\release', Lines) then
    exit;

  for I := 0 to GetArrayLength(Lines) - 1 do
    if Pos('JAVA_VERSION=', Lines[I]) = 1 then
    begin
      Value := Copy(Lines[I], Length('JAVA_VERSION=') + 1, Length(Lines[I]));
      StringChangeEx(Value, '"', '', True);

      { 25.0.1 and 25 are both releases of the same thing. }
      Dot := Pos('.', Value);
      if Dot > 0 then
        Value := Copy(Value, 1, Dot - 1);

      Result := StrToIntDef(Trim(Value), 0);
      exit;
    end;
end;

{ A folder is usable when it holds a JVM the launcher can load and that JVM is
  new enough. The library is checked rather than assumed: a JAVA_HOME left
  behind by an uninstalled Java is common, and it still has a release file. }
function IsUsableJava(Home: String; var Version: Integer): Boolean;
begin
  Result := False;
  if Home = '' then
    exit;

  Home := RemoveBackslashUnlessRoot(Home);

  if not FileExists(Home + '\bin\server\jvm.dll') then
    if not FileExists(Home + '\bin\client\jvm.dll') then
      exit;

  Version := JavaMajorVersion(Home);
  Result := Version >= RequiredJava;
end;

{ Fills SystemJavaHome and SystemJavaVersion, or leaves them empty. Any Java 25
  will do, so the first usable candidate wins and the order does not matter. }
procedure FindSystemJava;
var
  I, Version: Integer;
begin
  SystemJavaHome := '';
  SystemJavaVersion := 0;

  CollectCandidates;

  for I := 0 to GetArrayLength(Candidates) - 1 do
    if IsUsableJava(Candidates[I], Version) then
    begin
      SystemJavaHome := RemoveBackslashUnlessRoot(Candidates[I]);
      SystemJavaVersion := Version;
      exit;
    end;
end;

{ ---------------------------------------------------------------------------
  The choice, and what it changes.
  --------------------------------------------------------------------------- }

{ Called once for every file in the runtime, so it does no work of its own. }
function UseBundledRuntime: Boolean;
begin
  Result := (SystemJavaHome = '') or (JavaPage.SelectedValueIndex = 1);
end;

procedure InitializeWizard;
var
  Caption, Body: String;
begin
  FindSystemJava;

  if SystemJavaHome <> '' then
  begin
    Caption := CustomMessage('JavaCaptionFound');
    { An opening bracket at the start of a line is read as a section header,
      even in here, so the argument list stays on one line. }
    Body := FmtMessage(CustomMessage('JavaBodyFound'), [IntToStr(SystemJavaVersion),
      SystemJavaHome, IntToStr(RuntimeMegabytes), '{#AppName}']);
  end
  else
  begin
    Caption := CustomMessage('JavaCaptionMissing');
    Body := FmtMessage(CustomMessage('JavaBodyMissing'), ['{#AppName}',
      IntToStr(RuntimeMegabytes)]);
  end;

  JavaPage := CreateInputOptionPage(wpSelectDir,
    Caption,
    FmtMessage(CustomMessage('JavaHeader'), ['{#AppName}']),
    Body, True, False);

  if SystemJavaHome <> '' then
  begin
    JavaPage.Add(FmtMessage(CustomMessage('JavaUseSystem'), [IntToStr(RuntimeMegabytes)]));
    JavaPage.Add(CustomMessage('JavaUseBundled'));
  end
  else
  begin
    { Nothing to choose between, but the page is still shown: installing a
      runtime is the sort of thing a user is entitled to be told about before
      it happens rather than after. }
    JavaPage.Add(CustomMessage('JavaUseBundled'));
    JavaPage.CheckListBox.Enabled := False;
  end;

  JavaPage.SelectedValueIndex := 0;
end;

{ Points the launcher at the Java the user chose.

  The launcher reads this file at every start and looks for its runtime in the
  folder app.runtime names, falling back to one beside itself. jpackage does
  not write that key — adding it here is the whole mechanism by which the
  bundled runtime can be left out. }
procedure PointLauncherAtSystemJava;
var
  Path: String;
  Lines, Rewritten: TArrayOfString;
  I, Count: Integer;
begin
  Path := ExpandConstant('{app}\app\RelicFinder.cfg');
  if not LoadStringsFromFile(Path, Lines) then
    RaiseException('Cannot read ' + Path);

  Count := 0;
  SetArrayLength(Rewritten, GetArrayLength(Lines) + 1);

  for I := 0 to GetArrayLength(Lines) - 1 do
  begin
    { A key left over from an earlier install goes, so two cannot stack up. }
    if Pos('app.runtime=', Lines[I]) <> 1 then
    begin
      Rewritten[Count] := Lines[I];
      Count := Count + 1;

      if Pos('[Application]', Lines[I]) = 1 then
      begin
        Rewritten[Count] := 'app.runtime=' + SystemJavaHome;
        Count := Count + 1;
      end;
    end;
  end;

  SetArrayLength(Rewritten, Count);
  if not SaveStringsToFile(Path, Rewritten, False) then
    RaiseException('Cannot write ' + Path);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and not UseBundledRuntime then
    PointLauncherAtSystemJava;
end;

{ ---------------------------------------------------------------------------
  Uninstalling.
  --------------------------------------------------------------------------- }

{ The application sits in the tray, and the ordinary way to remove it — from
  the installed programs list, without touching the tray first — leaves it
  running while its own folder is being deleted. It holds the launcher, the
  runtime's jvm.dll and the jar open; Windows will not delete an open file;
  and the uninstaller ends on "some elements could not be removed" without
  ever saying which ones. Closing it first is the whole fix.

  Nothing is lost by ending it this way: the wishlist, the owned parts and the
  price cache are each written to a temporary file and renamed over the real
  one, so a copy that stops mid-write leaves the previous version intact. }
procedure StopRunningApplication;
var
  Code: Integer;
begin
  if not Exec(ExpandConstant('{sys}\taskkill.exe'), '/IM {#AppExe} /F', '',
              SW_HIDE, ewWaitUntilTerminated, Code) then
    exit;

  { Anything other than zero means there was nothing to close. }
  if Code = 0 then
    { The process goes before its handles do. }
    Sleep(1500);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Data: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    StopRunningApplication;
    exit;
  end;

  if CurUninstallStep <> usPostUninstall then
    exit;

  Data := ExpandConstant('{localappdata}\RelicFinder');
  if not DirExists(Data) then
    exit;

  { Asked rather than assumed, and defaulting to No: a wishlist is months of
    play, and reinstalling to fix something should not cost it. }
  if MsgBox(FmtMessage(CustomMessage('RemoveDataText'), [Data, '{#AppName}']),
            mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    DelTree(Data, True, True, True);
end;
