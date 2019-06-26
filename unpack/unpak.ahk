#SingleInstance Force
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
SetBatchlines,-1
#Include lib\Gdip_All.ahk


SOURCE_DIR := "D:\Steam\steamapps\common\Heroes of Might & Magic III - HD Edition\data"
CONVERT_APP := "lib\convert.exe"
ZLIB_DLL := "lib\zlib1.dll"

DESTINATION_DIR := "assets"
TEMP_DDS := "temp.dds"
TEMP_BMP := "temp.bmp"


OnExit("onAppExit")
token := Gdip_Startup()
assetsCount := 0
FileCreateDir, %DESTINATION_DIR%
FileDelete, %DESTINATION_DIR%\*
Loop, %SOURCE_DIR%\*.pak
{
	parsePakFile(A_LoopFileLongPath)
}
MsgBox Done!`nCreated %assetsCount% files in "%DESTINATION_DIR%".


ExitApp
ESC::
ExitApp
;====================================================================================

parsePakFile(pakFilePath) {
	global ZLIB_DLL, DESTINATION_DIR, assetsCount
	
	f := FileOpen(pakFilePath, "r") 
	f.Seek(4, 0) ; unknown (04 00 00 00)
	f.Seek(f.ReadUInt(), 0) ; jump to toc
	itemCount := f.ReadUInt()
	map := {}
	Loop %itemCount% {
		item := {}
		item.name := f.Read(8)
		f.Seek(12, 1) ; unknown
		item.begin := f.ReadUInt()
		item.headerSize := f.ReadUInt()
		zipCount := f.ReadUInt()
		f.Seek(4, 1) ; total length of zips
		f.Seek(4, 1) ; unknown
		item.zipSizes := []
		Loop %zipCount% {
			item.zipSizes.Push(f.ReadUInt())
		}
		map[item.name] := item
		f.Seek(4 * zipCount, 1) ; unknown (80 40 00 00 for each zip)
	}

	For key, item in map {
		f.Seek(item.begin, 0)
	
		header := f.Read(item.headerSize)
		zipToSprites := {}
		For key in item.zipSizes {
			zipToSprites[key] := []
		}
		infos := StrSplit(header, "`r`n")
		For key, info in infos {
			match1 := 0
			RegExMatch(info, "(\w+) (\d+) \d+ \d+ \d+ \d+ (\d+) (\d+) (\d+) (\d+) (\d+)", match)
			if (match1) {
				sprite := {}
				sprite.name := match1
				sprite.x := match3
				sprite.y := match4
				sprite.w := match5
				sprite.h := match6
				sprite.r := match7
				zipToSprites[match2 + 1].Push(sprite)
			}
		}

		For key, zipSize in item.zipSizes {
			f.RawRead(zip, zipSize)
			
			ddsSize := zipSize * 256 ; Note: 100 is not enough
			VarSetCapacity(dds, ddsSize)
			DllCall(ZLIB_DLL . "\uncompress", "Ptr", &dds, "UIntP", ddsSize, "Ptr", &zip, "UInt", zipSize)
			
			ddsBitmap := createBitmapFromDdsBytes(dds, ddsSize)
			
			sprites := zipToSprites[key]
			For key, sprite in sprites {
				x := sprite.x
				y := sprite.y
				w := sprite.w
				h := sprite.h
				r := sprite.r
				assetBitmap := Gdip_CreateBitmap(w,h)
				assetGraphics := Gdip_GraphicsFromImage(assetBitmap)
				Gdip_DrawImage(assetGraphics, ddsBitmap, 0, 0, w, h, x, y, w, h)
				if (r) {
					Gdip_ImageRotateFlip(assetBitmap)
				}
				
				assetPath := DESTINATION_DIR . "\" . sprite.name . ".png"
				;verifyFree(assetPath)
				Gdip_SaveBitmapToFile(assetBitmap, assetPath)
				verifyFile(assetPath)
				assetsCount++
				
				Gdip_DeleteGraphics(assetGraphics)
				Gdip_DisposeImage(assetBitmap)
			}
			
			Gdip_DisposeImage(ddsBitmap)
			deleteFile(TEMP_BMP)
		}
		return
		
	}
}

createBitmapFromDdsBytes(ByRef content, size) {
	global TEMP_DDS, TEMP_BMP, CONVERT_APP
	
	deleteFile(TEMP_DDS)
	f := FileOpen(TEMP_DDS, "w")
	f.RawWrite(content, size)
	f.Close()
	verifyFile(TEMP_DDS)
	
	deleteFile(TEMP_BMP)
	RunWait, %CONVERT_APP% %TEMP_DDS% %TEMP_BMP%,, UseErrorLevel Hide
	verifyFile(TEMP_BMP)
	
	ddsBitmap := Gdip_CreateBitmapFromFile(TEMP_BMP)
	return ddsBitmap
}

deleteFile(path) {
	if (FileExist(path)) {
		FileDelete, %path%
		if (FileExist(path)) {
			fail("Failed to delete file '" . path . "'!")
		}
	}
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
	global token, TEMP_DDS, TEMP_BMP
	deleteFile(TEMP_DDS)
	deleteFile(TEMP_BMP)
	Gdip_Shutdown(token)
}