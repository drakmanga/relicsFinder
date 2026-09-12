; Relic Finder — Windows installer.
;
; Wraps the application image jpackage produced (a launcher, the jar and a
; Java 25 runtime) into the single .exe a player downloads and runs.
;
; What it does beyond copying files:
;
;   * refuses to install on anything older than Windows 10;
;   * installs into the user's own folder and never asks for administrator
;     rights, which is what lets the application update itself in one click;
;   * looks for a Java 25 already on the machine — in the registry, on PATH
;     and in the folders vendors install into — and, if it finds one, offers
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
; Installed on its own, last, because a procedure has to run the moment it
; lands — see the [Files] section.
#define AppCfg "RelicFinder.cfg"
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

; Installs for the current user, into their own AppData, and there is no second
; option. Never elevates, and so never raises the blue prompt from Windows.
;
; The machine-wide install used to be offered here, and taking it away is what
; makes an update one click: the application updates itself by running a newer
; setup, and a setup that needs administrator rights turns that click into a
; consent prompt on every single version, for a program one person runs on
; their own desktop. An install nobody but its owner uses does not earn one.
;
; This costs nothing today and would cost a migration later: the only installs
; that exist are the author's and one friend's, both replaceable in a minute.
; Changing it back once there are strangers running it means leaving their copy
; stranded in Program Files, where the updater cannot reach it.
;
; {localappdata}\Programs rather than {autopf}: the two resolve to the same
; folder while PrivilegesRequired is lowest, and spelling it out means a later
; change to that line cannot silently move every install into Program Files.
PrivilegesRequired=lowest

DefaultDirName={localappdata}\Programs\{#AppName}
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

; A user who reports that the Java check did not see their Java has nothing to
; send without this. The log lands in the temporary folder and names every
; folder that was considered and why it was turned down. The uninstaller does
; not take this setting — run it with /LOG="somewhere.txt" for the same thing.
SetupLogging=yes

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
en.JavaCaptionMissing=No Java was found, so one will be installed
en.JavaHeader=%1 runs on Java 25
en.JavaBodyFound=This computer already has Java %1, in:%n%n%2%n%nUse it, or install the copy included here. Both work. Using the one already installed saves about %3 MB; installing the included copy keeps %4 working even if that Java is later removed.
en.JavaBodyMissing=No Java 25 or later was found on this computer. If you have one the search did not reach, this page cannot use it — but nothing is lost by installing the included copy.%n%nThat copy is inside this installer and will be placed in %1's own folder. Nothing is downloaded, nothing else on this computer is changed, and no other program will see it.%n%nThis adds about %2 MB.
en.JavaUseSystem=Use the Java already installed (saves about %1 MB)
en.JavaUseBundled=Install the included Java runtime (safest choice)
en.CreateDesktopIcon=Create a &desktop icon
en.LaunchApp=Open %1 now
en.RemoveDataText=Your wishlist, the parts marked as owned and the cached prices are kept in:%n%n%1%n%nDelete them?%n%nChoose No to keep them for a later reinstallation. %2 is installed for you alone, so nobody else on this computer is affected either way.
it.JavaCaptionFound=Java è già presente su questo computer
it.JavaCaptionMissing=Java non è stato trovato, quindi verrà installato
it.JavaHeader=%1 funziona con Java 25
it.JavaBodyFound=Su questo computer c'è già Java %1, in:%n%n%2%n%nPuoi usare quello, oppure installare la copia inclusa qui. Funzionano entrambi. Usare quello già installato risparmia circa %3 MB; installare la copia inclusa fa sì che %4 continui a funzionare anche se quel Java venisse rimosso.
it.JavaBodyMissing=Su questo computer non è stato trovato Java 25 o superiore. Se ne hai uno che la ricerca non ha raggiunto, questa pagina non può usarlo — ma installare la copia inclusa non toglie niente.%n%nQuella copia è dentro questo installer e verrà messa nella cartella di %1. Non viene scaricato niente, non viene modificato nient'altro sul computer, e nessun altro programma la vedrà.%n%nOccupa circa %2 MB.
it.JavaUseSystem=Usa il Java già installato (risparmia circa %1 MB)
it.JavaUseBundled=Installa il runtime Java incluso (scelta più sicura)
it.CreateDesktopIcon=Crea un'icona sul &desktop
it.LaunchApp=Apri %1 adesso
it.RemoveDataText=La wishlist, i pezzi segnati come posseduti e i prezzi in cache sono in:%n%n%1%n%nVuoi cancellarli?%n%nScegli No per conservarli in vista di una reinstallazione. %2 è installato solo per te, quindi in ogni caso non tocca nessun altro utente del computer.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#AppImage}\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppImage}\app\*"; DestDir: "{app}\app"; Excludes: "{#AppCfg}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Skipped entirely when the user chose the Java already on the machine. The
; files are inside this installer either way — the choice is about what ends up
; on their disk, not about what they download.
Source: "{#AppImage}\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: UseBundledRuntime

; The launcher's configuration, alone and last, so that everything it can point
; at is already on disk and AfterInstall can point it at the right one.
;
; The hook is here rather than in CurStepChanged(ssPostInstall), where it used
; to be, because ssPostInstall runs AFTER [Run] — and the relaunch entry in
; [Run] starts the launcher against this very file. An update on an install
; that uses the machine's Java got a fresh configuration with no app.runtime
; line, was relaunched against it, and died on "Failed to find JVM" in a
; runtime folder that install deliberately never had. The write has to happen
; before anything is started against it, and this is the last moment that is
; still true.
Source: "{#AppImage}\app\{#AppCfg}"; DestDir: "{app}\app"; Flags: ignoreversion; AfterInstall: ApplyJavaChoice

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
; nowait, because the launcher does not return: it is the application.
; postinstall leaves it as a tick box on the last page rather than something
; that happens whether or not it was wanted. runasoriginaluser is kept even
; though this setup never elevates: it costs nothing and it is the line that
; would otherwise have to be remembered if elevation ever came back, and the
; failure it prevents — a wishlist written into the administrator's AppData
; instead of the player's — is silent and permanent.
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchApp,{#AppName}}"; Flags: nowait postinstall skipifsilent runasoriginaluser

; The same launch, for the silent run the application starts on itself when the
; user clicks Update. The entry above cannot serve both: postinstall makes it a
; tick box on a page a silent run never shows, and skipifsilent then removes it
; altogether — which is right for every other silent install and wrong for this
; one, where the application closed itself a moment ago and has to come back.
;
; Guarded by a switch rather than by "silent", because a silent install started
; by hand or by a deployment tool has no business starting a program on
; somebody's desktop. Only the updater passes it.
Filename: "{app}\{#AppExe}"; Flags: nowait runasoriginaluser; Check: RelaunchRequested

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

  { Where the answer to the Java page is kept between one install and the next.

    It has to be kept somewhere: a silent run shows no page, so without a record
    it re-derives the choice from a fresh sweep every time, and an update then
    takes the bundled runtime away from whoever chose it on purpose and points
    their launcher at a Java they never agreed to depend on.

    HKCU rather than the file it configures, because the file is overwritten
    by [Files] before anything gets to read it. Under the publisher's own key
    rather than Inno's, which belongs to Inno. }
  ChoiceKey = 'Software\{#AppPublisher}\{#AppName}';
  ChoiceValue = 'JavaRuntime';

  { What that value holds when the bundled runtime was chosen. Anything else in
    it is the path of the Java that was chosen instead, and no Java home is
    spelled like this. }
  BundledMarker = 'bundled';

var
  JavaPage: TInputOptionWizardPage;
  SystemJavaHome: String;
  SystemJavaVersion: Integer;
  Candidates: TArrayOfString;

  { What the previous install recorded, or empty when there is no previous
    install. Read once, in InitializeWizard. }
  RecordedRuntime: String;

{ ---------------------------------------------------------------------------
  Finding a Java that is already here.

  There is no one place to look, and no single place is enough. Every vendor
  writes its own registry key; a per-user installation writes it under HKCU
  rather than HKLM; a Java unpacked from a zip writes none at all and lives
  only on PATH; and JAVA_HOME may point anywhere or be missing entirely from
  a machine that has three Javas on it.

  So the search sweeps all four — environment, registry under both hives,
  PATH, and the folders vendors install into — collects candidate folders
  from every one of them, and then asks the only question that matters of
  each: is there a JVM in it, and is it new enough.
  --------------------------------------------------------------------------- }

procedure AddCandidate(Home: String);
var
  Count, I: Integer;
begin
  Home := RemoveBackslashUnlessRoot(Trim(Home));
  if Home = '' then
    exit;

  { The same folder arrives here from the registry, from PATH and from the
    disk sweep. Without this it would be opened and parsed three times. }
  for I := 0 to GetArrayLength(Candidates) - 1 do
    if CompareText(Candidates[I], Home) = 0 then
      exit;

  Count := GetArrayLength(Candidates);
  SetArrayLength(Candidates, Count + 1);
  Candidates[Count] := Home;
end;

{ Every value under a vendor's key that could name an installation folder. The
  names cover Oracle and the OpenJDK builds between them; the MSI subkeys are
  where Temurin and the other Adoptium builds record their path. }
procedure AddCandidatesFromKey(RootKey: Integer; Key: String);
var
  Value: String;
begin
  if RegQueryStringValue(RootKey, Key, 'JavaHome', Value) then AddCandidate(Value);
  if RegQueryStringValue(RootKey, Key, 'InstallationPath', Value) then AddCandidate(Value);
  if RegQueryStringValue(RootKey, Key + '\hotspot\MSI', 'Path', Value) then AddCandidate(Value);
  if RegQueryStringValue(RootKey, Key + '\openj9\MSI', 'Path', Value) then AddCandidate(Value);
end;

procedure AddCandidatesFromRoot(RootKey: Integer; Root: String);
var
  Names: TArrayOfString;
  I: Integer;
begin
  { Oracle's layout puts the values on the root itself. }
  AddCandidatesFromKey(RootKey, Root);

  if RegGetSubkeyNames(RootKey, Root, Names) then
    for I := 0 to GetArrayLength(Names) - 1 do
      AddCandidatesFromKey(RootKey, Root + '\' + Names[I]);
end;

{ Read once for the machine and once for the user. An installation made for
  the current user only — which is what winget does when asked, and what the
  Temurin installer offers on its first page — puts everything under HKCU,
  and looking at HKLM alone finds nothing on a machine that plainly has Java. }
procedure AddCandidatesFromVendorKeys(RootKey: Integer);
begin
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\JavaSoft\JDK');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\JavaSoft\JRE');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\JavaSoft\Java Development Kit');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\JavaSoft\Java Runtime Environment');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Eclipse Adoptium\JDK');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Eclipse Adoptium\JRE');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Eclipse Foundation\JDK');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Eclipse Foundation\JRE');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\AdoptOpenJDK\JDK');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\AdoptOpenJDK\JRE');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Microsoft\JDK');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Azul Systems\Zulu');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\BellSoft\Liberica');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Amazon Corretto');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\Semeru\JDK');
  AddCandidatesFromRoot(RootKey, 'SOFTWARE\IBM\Semeru Runtime');
end;

{ Every folder on PATH that holds a java.exe, taken as the bin of a Java home.

  This is the one that catches a runtime installed from a zip, by Scoop, by
  SDKMAN or as part of an IDE: it can be the Java the user runs every day and
  still leave no registry key anywhere for the sweep above to find. }
procedure AddCandidatesFromPath;
var
  Remaining, Entry: String;
  Semicolon: Integer;
begin
  Remaining := GetEnv('PATH');

  while Remaining <> '' do
  begin
    Semicolon := Pos(';', Remaining);
    if Semicolon > 0 then
    begin
      Entry := Copy(Remaining, 1, Semicolon - 1);
      Remaining := Copy(Remaining, Semicolon + 1, Length(Remaining));
    end
    else
    begin
      Entry := Remaining;
      Remaining := '';
    end;

    { An entry with a space in it may be quoted. }
    StringChangeEx(Entry, '"', '', True);
    Entry := RemoveBackslashUnlessRoot(Trim(Entry));

    { PATH names the bin folder; the home is its parent. }
    if (Entry <> '') and FileExists(Entry + '\java.exe') then
      AddCandidate(ExtractFileDir(Entry));
  end;
end;

{ Every immediate subfolder of a place vendors install into. Nothing here is
  assumed to be a Java: a folder only survives the check below if it has a
  JVM in it, so sweeping a directory that holds other things costs nothing. }
procedure AddCandidatesFromParent(Parent: String);
var
  Find: TFindRec;
begin
  if not DirExists(Parent) then
    exit;

  if FindFirst(AddBackslash(Parent) + '*', Find) then
  try
    repeat
      if (Find.Attributes and FILE_ATTRIBUTE_DIRECTORY <> 0)
        and (Find.Name <> '.') and (Find.Name <> '..') then
        AddCandidate(AddBackslash(Parent) + Find.Name);
    until not FindNext(Find);
  finally
    FindClose(Find);
  end;
end;

{ The last resort, for a Java that answered to none of the above: look where
  the installers put things. A per-user Temurin lands under Programs in the
  user's own AppData, which is why that one is here twice over. }
procedure AddCandidatesFromWellKnownFolders;
var
  Programs: String;
begin
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Java'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Eclipse Adoptium'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Eclipse Foundation'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\AdoptOpenJDK'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Microsoft'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Zulu'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\BellSoft'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Amazon Corretto'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\Semeru'));
  AddCandidatesFromParent(ExpandConstant('{commonpf}\IBM'));
  AddCandidatesFromParent(ExpandConstant('{commonpf32}\Java'));

  Programs := ExpandConstant('{localappdata}\Programs');
  AddCandidatesFromParent(Programs + '\Eclipse Adoptium');
  AddCandidatesFromParent(Programs + '\Microsoft');
  AddCandidatesFromParent(Programs + '\Zulu');

  { Where a zip tends to be unpacked when it is unpacked by hand. }
  AddCandidatesFromParent(ExpandConstant('{sd}\Java'));

  { IntelliJ and the JetBrains Toolbox download runtimes here and register
    them nowhere. A developer's machine can have four of them and nothing in
    the registry to show for it. }
  AddCandidatesFromParent(GetEnv('USERPROFILE') + '\.jdks');
end;

procedure CollectCandidates;
begin
  SetArrayLength(Candidates, 0);

  { First, because a machine with JAVA_HOME set has an answer to this question
    already and it is the one its owner chose. Note that this reads the
    environment the installer was started with: a JAVA_HOME set system-wide
    since the user last signed in is not in it yet, which is exactly why the
    three searches below are not optional. }
  AddCandidate(GetEnv('JAVA_HOME'));

  AddCandidatesFromVendorKeys(HKLM64);
  AddCandidatesFromVendorKeys(HKCU64);

  AddCandidatesFromPath;
  AddCandidatesFromWellKnownFolders;
end;

{ The major version as the runtime itself reports it, for the builds that ship
  without a release file. -version writes to standard error, which is why both
  streams are redirected; the doubled quoting is cmd's own, the outer pair
  holding the command together once the inner ones have quoted the paths. }
function JavaVersionFromExe(Home: String): Integer;
var
  Report, Line: String;
  Lines: TArrayOfString;
  Code, I, Opening, Closing, Dot: Integer;
begin
  Result := 0;

  if not FileExists(Home + '\bin\java.exe') then
    exit;

  Report := ExpandConstant('{tmp}\java-version.txt');
  DeleteFile(Report);

  if not Exec(ExpandConstant('{cmd}'),
      '/C ""' + Home + '\bin\java.exe" -version >"' + Report + '" 2>&1"',
      '', SW_HIDE, ewWaitUntilTerminated, Code) then
    exit;

  if not LoadStringsFromFile(Report, Lines) then
    exit;

  { openjdk version "25.0.1" 2025-10-21 — the first quoted thing it prints. }
  for I := 0 to GetArrayLength(Lines) - 1 do
  begin
    Line := Lines[I];

    Opening := Pos('"', Line);
    if Opening = 0 then
      Continue;
    Line := Copy(Line, Opening + 1, Length(Line));

    Closing := Pos('"', Line);
    if Closing = 0 then
      Continue;
    Line := Copy(Line, 1, Closing - 1);

    { 1.8.0_411 in the old scheme, 25.0.1 in everything since. }
    if Pos('1.', Line) = 1 then
      Line := Copy(Line, 3, Length(Line));

    Dot := Pos('.', Line);
    if Dot > 0 then
      Line := Copy(Line, 1, Dot - 1);

    Result := StrToIntDef(Trim(Line), 0);
    exit;
  end;
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
  Version := 0;

  if Home = '' then
    exit;

  Home := RemoveBackslashUnlessRoot(Home);

  if not FileExists(Home + '\bin\server\jvm.dll') then
    if not FileExists(Home + '\bin\client\jvm.dll') then
    begin
      Log('Java: no JVM in ' + Home);
      exit;
    end;

  Version := JavaMajorVersion(Home);

  { Only for the few builds whose release file is missing or unreadable, so
    the cost of starting a JVM to ask is paid once at most, and only for a
    folder already known to hold one. }
  if Version = 0 then
    Version := JavaVersionFromExe(Home);

  Log('Java: ' + Home + ' is version ' + IntToStr(Version)
    + ', required ' + IntToStr(RequiredJava));

  Result := Version >= RequiredJava;
end;

{ ---------------------------------------------------------------------------
  What the last install was told, so this one does not have to guess.
  --------------------------------------------------------------------------- }

{ Whether the recorded answer was the bundled runtime. False when nothing was
  recorded, which is a first install rather than a choice. }
function RecordedBundled: Boolean;
begin
  Result := CompareText(RecordedRuntime, BundledMarker) = 0;
end;

{ The Java the recorded answer names, or empty when it named none. }
function RecordedJavaHome: String;
begin
  if (RecordedRuntime = '') or RecordedBundled then
    Result := ''
  else
    Result := RecordedRuntime;
end;

procedure ReadRecordedChoice;
begin
  RecordedRuntime := '';

  if not RegQueryStringValue(HKCU64, ChoiceKey, ChoiceValue, RecordedRuntime) then
  begin
    RecordedRuntime := '';
    Log('Java: no previous choice recorded, this is a first install');
    exit;
  end;

  RecordedRuntime := Trim(RecordedRuntime);
  Log('Java: the previous install recorded ' + RecordedRuntime);
end;

{ Writes the answer down for the next silent run to obey.

  Never fatal. The install it belongs to is correct either way, and the only
  thing a failure costs is that the next update has to derive the choice again
  — which is the behaviour that existed before this was recorded at all. Logged
  so that derivation has an explanation when it goes somewhere unexpected. }
procedure RecordJavaChoice(Value: String);
begin
  if RegWriteStringValue(HKCU64, ChoiceKey, ChoiceValue, Value) then
    Log('Java: recorded ' + Value + ' under HKCU\' + ChoiceKey)
  else
    Log('Java: could not record ' + Value + ' under HKCU\' + ChoiceKey);
end;

{ Fills SystemJavaHome and SystemJavaVersion, or leaves them empty. Any Java 25
  will do, so the first usable candidate wins and the order does not matter. }
procedure FindSystemJava;
var
  I, Version: Integer;
begin
  SystemJavaHome := '';
  SystemJavaVersion := 0;

  { The Java a previous install recorded comes before the sweep, because it is
    the one its owner agreed to depend on. Without this an update would move
    the installation onto whichever Java the sweep reached first, which on a
    machine with three of them is a coin toss the user never asked to throw.
    The sweep below still answers for a first install, and for a recorded Java
    that has since been uninstalled. }
  if (RecordedJavaHome <> '') and IsUsableJava(RecordedJavaHome, Version) then
  begin
    SystemJavaHome := RemoveBackslashUnlessRoot(RecordedJavaHome);
    SystemJavaVersion := Version;
    Log('Java: using the one the previous install recorded, ' + SystemJavaHome);
    exit;
  end;

  CollectCandidates;
  Log('Java: ' + IntToStr(GetArrayLength(Candidates)) + ' candidate folder(s)');

  for I := 0 to GetArrayLength(Candidates) - 1 do
    if IsUsableJava(Candidates[I], Version) then
    begin
      SystemJavaHome := RemoveBackslashUnlessRoot(Candidates[I]);
      SystemJavaVersion := Version;
      Log('Java: using ' + SystemJavaHome);
      exit;
    end;

  Log('Java: none usable, the bundled runtime will be installed');
end;

{ ---------------------------------------------------------------------------
  The choice, and what it changes.
  --------------------------------------------------------------------------- }

{ Called once for every file in the runtime, so it does no work of its own:
  everything it reads was decided in InitializeWizard. }
function UseBundledRuntime: Boolean;
begin
  { No Java to use, so there is nothing to choose between. }
  if SystemJavaHome = '' then
  begin
    Result := True;
    exit;
  end;

  { A silent run has no page to ask with, so it obeys the last answer somebody
    was actually asked for. An update is always silent, and this is what keeps
    the choice made at install time in force across every version after it.

    Nothing recorded falls through to the page's own default, which is the
    behaviour a silent install had before this existed: the machine's Java when
    there is one. A silent FIRST install is a deployment tool or a smoke test,
    neither of which has an opinion to preserve. }
  if WizardSilent and (RecordedRuntime <> '') then
  begin
    Result := RecordedBundled;
    exit;
  end;

  Result := JavaPage.SelectedValueIndex = 1;
end;

{ Whether this run was started by the application updating itself.

  /RELAUNCH=yes is passed by nothing else. The value is compared rather than
  the switch merely being present, because Inno reads a missing /X as the empty
  string and an empty string is not a request. }
function RelaunchRequested: Boolean;
begin
  Result := CompareText(ExpandConstant('{param:RELAUNCH|no}'), 'yes') = 0;
end;

procedure InitializeWizard;
var
  Caption, Body: String;
begin
  { Before the search, which prefers what it finds here. }
  ReadRecordedChoice;
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

  { The recorded answer is the default, so a reinstall clicked through without
    reading does not quietly move somebody onto a different runtime. Guarded on
    a Java being there, because without one the page has a single item. }
  JavaPage.SelectedValueIndex := 0;
  if (SystemJavaHome <> '') and RecordedBundled then
    JavaPage.SelectedValueIndex := 1;
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
  Written: Boolean;
begin
  Path := ExpandConstant('{app}\app\{#AppCfg}');
  if not LoadStringsFromFile(Path, Lines) then
  begin
    { Logged before it is raised, because a silent run is started with
      /SUPPRESSMSGBOXES and the exception is the whole of what the user sees:
      nothing. The log is then the only account of what happened. }
    Log('Java: cannot read ' + Path);
    RaiseException('Cannot read ' + Path);
  end;

  Written := False;
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
        Written := True;
      end;
    end;
  end;

  { The key is inserted under a section header that jpackage has always
    written, and a file without one would be saved back unchanged — an install
    that reports success and a launcher that cannot start, which is the exact
    pair this whole hook exists to stop happening again. }
  if not Written then
  begin
    Log('Java: no [Application] section in ' + Path + ', nowhere to put app.runtime');
    RaiseException('No [Application] section in ' + Path);
  end;

  SetArrayLength(Rewritten, Count);
  if not SaveStringsToFile(Path, Rewritten, False) then
  begin
    Log('Java: cannot write ' + Path);
    RaiseException('Cannot write ' + Path);
  end;
end;

{ Applies the choice to the copy on disk, and writes it down for the next one.

  Called from [Files], the moment the launcher's configuration lands and
  before [Run] starts anything against it. The branch it took is logged either
  way: the one question a user reporting a launcher that will not start can
  answer from their setup log is which of these two happened. }
procedure ApplyJavaChoice;
begin
  if UseBundledRuntime then
  begin
    { The configuration out of the application image carries no app.runtime, so
      the launcher falls back to the runtime folder beside itself, which is the
      one this branch installed. }
    Log('Java: branch=bundled, the runtime beside the launcher is the runtime');
    RecordJavaChoice(BundledMarker);
    exit;
  end;

  Log('Java: branch=system, pointing the launcher at ' + SystemJavaHome);

  { Recorded only once it has been applied, so a failed write never leaves a
    record of a choice this install is not actually running. }
  PointLauncherAtSystemJava;
  RecordJavaChoice(SystemJavaHome);
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

  { The recorded Java choice goes with the installation that made it. Left
    behind, it would answer on behalf of an install the user has not made yet,
    naming a Java they may have removed in the meantime. The publisher key
    above it only goes if it is now empty — nothing else of this project's
    writes there today, but a key is not ours to delete on that basis. }
  RegDeleteKeyIncludingSubkeys(HKCU64, ChoiceKey);
  RegDeleteKeyIfEmpty(HKCU64, 'Software\{#AppPublisher}');

  Data := ExpandConstant('{localappdata}\RelicFinder');
  if not DirExists(Data) then
    exit;

  { Asked rather than assumed, and defaulting to No: a wishlist is months of
    play, and reinstalling to fix something should not cost it. }
  if MsgBox(FmtMessage(CustomMessage('RemoveDataText'), [Data, '{#AppName}']),
            mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
    DelTree(Data, True, True, True);
end;
