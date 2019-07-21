#NoEnv
SendMode Input
SetWorkingDir %A_ScriptDir%
#SingleInstance, Force


; constants
H3_WINDOW_NAME := "Heroes of Might and Magic III"
H3_DEFAULT_DIR := "D:\H3\HoMM 3 Complete"
H3_LAUNCHER := "HD_Launcher.exe"
H3_LAUNCHER_WINDOW := "HoMM3 HD"


; register cleanup handler
OnExit("onAppExit")


; read entry parameter
h3Dir := A_Args[1]
if (!h3Dir) {
	h3Dir := H3_DEFAULT_DIR
}
if (!FileExist(h3Dir)) {
	die("Cannot find folder: " . h3Dir)
}
	

; start launcher
SetWorkingDir %h3Dir%
h3Launcher := h3Dir . "\" . H3_LAUNCHER
if (!FileExist(h3Launcher)) {
	die("Cannot find exe: " . h3Launcher)
}
Run, %h3Launcher%


; press enter to start H3
WinWaitActive, %H3_LAUNCHER_WINDOW%,,1
if (!WinActive(H3_LAUNCHER_WINDOW)) {
	die("Cannot find window: " . H3_LAUNCHER_WINDOW)
}
Send, {ENTER}
WinKill, %H3_LAUNCHER_WINDOW%


; guardian loop
isActive := 0
SetTimer, UpdateTooltip, 200
Loop {
	WinWaitActive, %H3_WINDOW_NAME%,,1
	if (WinActive(H3_WINDOW_NAME)) {
		WinGetPos, X, Y, W, H, A
		confineCursor(X + 10, Y + 60, X + W - 20, Y + H - 80)	
		isActive := 1
		WinWaitNotActive
	}
	isActive := 0
	if (!WinExist(H3_WINDOW_NAME)) {
		ExitApp
	}
}

ExitApp


ESC::
ExitApp



UpdateTooltip:
ToolTip, %isActive%, 0, 0
return


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

die(message) {
	MsgBox % message
	ExitApp
}
