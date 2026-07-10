Set WshShell = CreateObject("WScript.Shell")
strPath = Wscript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.GetFile(strPath)
strFolder = objFSO.GetParentFolderName(objFile) 
WshShell.CurrentDirectory = strFolder
WshShell.Run chr(34) & strFolder & "\floxync-daemon.exe" & chr(34), 0, False
Set WshShell = Nothing
