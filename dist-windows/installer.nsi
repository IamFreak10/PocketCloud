; NSIS Modern User Interface script for PocketCloud Windows Setup Installer
!include "MUI2.nsh"

Name "PocketCloud"
OutFile "PocketCloud-Setup-0.1.0.exe"
InstallDir "$PROGRAMFILES64\PocketCloud"
InstallDirRegKey HKLM "Software\PocketCloud" "Install_Dir"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "../src-tauri/icons/icon.ico"
!define MUI_UNICON "../src-tauri/icons/icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

Section "PocketCloud Core" SecCore
  SetOutPath "$INSTDIR"
  
  File "PocketCloud.exe"
  File "../src-tauri/icons/icon.ico"

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Registry keys for Add/Remove Programs
  WriteRegStr HKLM "Software\PocketCloud" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "DisplayName" "PocketCloud — Zero-Cost Private Cloud & Full VPS Sandbox"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "DisplayIcon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "DisplayVersion" "0.1.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "Publisher" "PocketCloud Team"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud" "NoRepair" 1

  ; Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\PocketCloud"
  CreateShortcut "$SMPROGRAMS\PocketCloud\PocketCloud.lnk" "$INSTDIR\PocketCloud.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\PocketCloud\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0

  ; Desktop Shortcut
  CreateShortcut "$DESKTOP\PocketCloud.lnk" "$INSTDIR\PocketCloud.exe" "" "$INSTDIR\icon.ico" 0
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\PocketCloud.lnk"
  Delete "$SMPROGRAMS\PocketCloud\PocketCloud.lnk"
  Delete "$SMPROGRAMS\PocketCloud\Uninstall.lnk"
  RMDir "$SMPROGRAMS\PocketCloud"

  Delete "$INSTDIR\PocketCloud.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PocketCloud"
  DeleteRegKey HKLM "Software\PocketCloud"
SectionEnd
