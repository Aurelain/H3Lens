module.exports = {
    open: (buffer) => {
        return {buffer, pos: 0}
    },
    seek: (handle, pos, mode) => {
        handle.pos = (mode === 0 ? pos : (handle.pos + pos));
    },
    read: (handle, count) => {
        const value = handle.buffer.slice(handle.pos, handle.pos + count);
        handle.pos += count;
        return value;
    },
    readUInt8: (handle) => {
        return handle.buffer.readUInt8(handle.pos++);
    },
    readUInt32: (handle) => {
        const value = handle.buffer.readUInt32LE(handle.pos);
        handle.pos += 4;
        return value;
    },
};