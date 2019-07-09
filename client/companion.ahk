#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
#Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
#SingleInstance, Force


MsgBox Started
for n, param in A_Args  ; For each parameter:
{
    MsgBox Parameter number %n% is %param%.
}
ExitApp
;A_Args[1] := "notepad.exe"

return
OnExit("onAppExit")
Run, notepad.exe

Loop {
	WinWaitActive, Untitled,,1
	if (WinActive("Untitled")) {
		WinGetPos, X, Y, W, H, A
		confineCursor(X,Y+40,X+W-10,Y+H-10)		
	}
	WinWaitNotActive
	;ClipCursor(false)
	if (!WinExist("Untitled")) {
		ExitApp
	}
	WinMinimize
}


ESC::
ExitApp

confineCursor(x1=0 , y1=0, x2=1, y2=1 ) {
  VarSetCapacity(R,16,0)
  NumPut(x1,&R+0)
  NumPut(y1,&R+4)
  NumPut(x2,&R+8)
  NumPut(y2,&R+12)
  DllCall( "ClipCursor", UInt, &R )
}

freeCursor() {
	DllCall( "ClipCursor", "UInt", 0)
}

onAppExit() {
	freeCursor()
}
