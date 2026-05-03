!macro customInstall
  DetailPrint "Registering Timetable Generator Backend Service..."
  nsExec::ExecToLog '"$INSTDIR\Timetable Generator.exe" --install-service'
!macroend

!macro customUninstall
  DetailPrint "Unregistering Timetable Generator Backend Service..."
  nsExec::ExecToLog '"$INSTDIR\Timetable Generator.exe" --uninstall-service'
!macroend
