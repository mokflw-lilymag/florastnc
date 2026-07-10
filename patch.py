import struct
import sys

def patch_subsystem(exe_path, target_subsystem=2):
    with open(exe_path, 'rb+') as f:
        f.seek(0x3C) # e_lfanew
        pe_offset = struct.unpack('<I', f.read(4))[0]
        
        f.seek(pe_offset)
        signature = f.read(4)
        if signature != b'PE\0\0':
            print("Not a PE file!")
            return
            
        f.seek(pe_offset + 24)
        magic = struct.unpack('<H', f.read(2))[0]
        
        if magic == 0x10b: # PE32
            subsystem_offset = pe_offset + 24 + 68
        elif magic == 0x20b: # PE32+
            subsystem_offset = pe_offset + 24 + 68
        else:
            print("Unknown PE magic:", hex(magic))
            return
            
        f.seek(subsystem_offset)
        current_subsystem = struct.unpack('<H', f.read(2))[0]
        print(f"Current subsystem: {current_subsystem}")
        
        if current_subsystem != target_subsystem:
            f.seek(subsystem_offset)
            f.write(struct.pack('<H', target_subsystem))
            print(f"Patched subsystem to {target_subsystem} (WINDOWS_GUI)")
        else:
            print(f"Subsystem is already {target_subsystem}")

if __name__ == '__main__':
    patch_subsystem(sys.argv[1])
