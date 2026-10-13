Unicode true
Name "Lumos preserve-files smoke"
OutFile "${OUTPUT_FILE}"
InstallDir "$TEMP\lumos-preserve-files-smoke"
RequestExecutionLevel user
SilentInstall silent

!addincludedir "${NSIS_INCLUDE_DIR}"
!addincludedir "${ELECTRON_BUILDER_NSIS_INCLUDE_DIR}"
!addplugindir /x86-unicode "${NSIS_PLUGIN_DIR}"
!include "LogicLib.nsh"

!define APP_FILENAME "Lumos"
!define APP_ID "dev.lumos.preserve-files-smoke"
!define UNINSTALL_FILENAME "uninstaller.exe"
!define isUpdated `1 == 1`
; This fixture has no electron-builder uninstaller.nsh section; use a normal function for log smoke coverage.
!ifdef BUILD_UNINSTALLER
  !define LUMOS_UNINSTALLER_FUNCTION_PREFIX ""
!endif

Var appExe

!include "${LUMOS_INSTALLER_NSH}"

Section
  SetOutPath "$INSTDIR"
  File /oname=Lumos.exe "${FIXTURE_EXE}"
  StrCpy $appExe "$INSTDIR\Lumos.exe"
  !ifndef OMIT_MANIFEST
    FileOpen $0 "$INSTDIR\.lumos-install-manifest" w
    FileWrite $0 "owned-by-lumos.txt$\r$\n"
    FileWrite $0 "..\user-data.txt$\r$\n"
    FileClose $0
  !endif
  !ifdef FAIL_DELETE
    ; Keep the file handle open so Windows denies the manifest cleanup delete.
    FileOpen $0 "$INSTDIR\owned-by-lumos.txt" w
    FileWrite $0 "locked app payload"
  !else
    FileOpen $0 "$INSTDIR\owned-by-lumos.txt" w
    FileWrite $0 "old app payload"
    FileClose $0
  !endif
  FileOpen $0 "$INSTDIR\user-data.txt" w
  FileWrite $0 "keep me"
  FileClose $0
  !insertmacro customRemoveFiles
  IfFileExists "$INSTDIR\owned-by-lumos.txt" 0 lumosOwnedRemoved
    StrCpy $1 "present"
    Goto lumosWriteMarker
  lumosOwnedRemoved:
    StrCpy $1 "removed"
  lumosWriteMarker:
    FileOpen $0 "$INSTDIR\remove-result.txt" w
    FileWrite $0 "$1"
    FileClose $0
SectionEnd
