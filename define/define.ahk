#SingleInstance Force
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
SetBatchlines,-1
#Include lib\Gdip_All.ahk


SOURCE_DIR := "D:\H3\HoMM 3 Complete\Data"
ZLIB_DLL := "lib\zlib1.dll"

DESTINATION_DIR := "assets"
startTime := A_TickCount
token := Gdip_Startup()
assetsCount := 0
FileCreateDir, %DESTINATION_DIR%
FileDelete, %DESTINATION_DIR%\*
Loop, %SOURCE_DIR%\*.lod
{
	parseLodFile(A_LoopFileLongPath)
}
duration := A_TickCount - startTime
MsgBox Done!`nCreated %assetsCount% files in "%DESTINATION_DIR%" (%duration% ms)


ExitApp
ESC::
ExitApp
;====================================================================================

parseLodFile(lodFilePath) {
	global ZLIB_DLL, DESTINATION_DIR, assetsCount
	
	f := FileOpen(lodFilePath, "r") 
	f.Seek(8, 0) ; jump to count
	itemsCount := f.ReadUint()
	f.Seek(92, 0) ; the records always start at 0x5C
	map := {}
	Loop %itemsCount% {
		item := {}
		item.name := f.Read(12)
		f.Seek(4, 1) ; unknown
		item.begin := f.ReadUint()
		f.Seek(8, 1) ; unknown
		item.size := f.ReadUint()
		map[item.name] := item
	}
	For key, item in map {
		if (RegExMatch(key, "i)def$|pcx$")) {
			assetsCount++
			begin := item.begin
			size := item.size
			f.Seek(begin, 0)
			f.RawRead(zip, size)
			
			bufferSize := size * 100
			VarSetCapacity(buffer, bufferSize)
			DllCall(ZLIB_DLL . "\uncompress", "Ptr", &buffer, "UIntP", bufferSize, "Ptr", &zip, "UInt", size)
			
			if (RegExMatch(key, "i)pcx")) {
				;parsePcxBuffer(buffer)
			} else {
				;parseDefBuffer(buffer)
			}
			
		}
	}
}

parsePcxBuffer(buffer) {
	global ZLIB_DLL, DESTINATION_DIR, assetsCount
	assetPath := DESTINATION_DIR . "\" . item.name
	
	d := FileOpen(assetPath, "w")
	d.RawWrite(def, defSize)
	d.Close()
	MsgBox % key
}

verifyFile(path) {
	if (!FileExist(path)) {
		fail("Missing file '" . path . "'!")
	}
}

verifyFree(path) {
	if (FileExist(path)) {
		fail("Occupied path '" . path . "'!")
	}
}

fail(message) {
	MsgBox % message
	ExitApp
}

onAppExit() {
	global token
	Gdip_Shutdown(token)
}

logNext(ByRef f) {
	pos := f.Pos
	f.RawRead(byte, 1)
	msg := "Byte: " . FHex(Numget(byte)) . "`nPosition dec: " . pos . "`nPosition hex: " . FHex(pos)
	MsgBox % msg
	f.Seek(-1, 1)
}

FHex( int, pad=0 ) { ; Function by [VxE]. Formats an integer (decimals are truncated) as hex.
	Static hx := "0123456789ABCDEF"
	If !( 0 < int |= 0 )
		Return !int ? "0x0" : "-" FHex( -int, pad )
	s := 1 + Floor( Ln( int ) / Ln( 16 ) )
	h := SubStr( "0x0000000000000000", 1, pad := pad < s ? s + 2 : pad < 16 ? pad + 2 : 18 )
	u := A_IsUnicode = 1
	Loop % s
		NumPut( *( &hx + ( ( int & 15 ) << u ) ), h, pad - A_Index << u, "UChar" ), int >>= 4
	Return h
}
