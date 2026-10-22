Dim fso, sh, base, exePath
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = base
exePath = base & "\node_modules\electron\dist\electron.exe"
If fso.FileExists(exePath) Then
  sh.Run """" & exePath & """ """ & base & """", 1, False
Else
  sh.Run """" & base & "\app\index.html""", 1, False
End If
