// Relay game Ball Fight untuk uji online pribadi; host tetap menjalankan simulasi.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
function lanAddresses() {
    try { return [...new Set(Object.values(os.networkInterfaces()).flat().filter(x => x && (x.family === 'IPv4' || x.family === 4) && !x.internal).map(x => x.address))]; } catch (_) { return []; }
}
const { WebSocketServer, WebSocket } = require('ws');
const { randomInt } = require('crypto');

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url === '/health') {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        return res.end(JSON.stringify({game:'ball-fight-online',protocol:1}));
    }
    if (url === '/lan-info') {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
        return res.end(JSON.stringify({ips:[]}));
    }
    if (url !== '/' && url !== '/game.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Tidak ditemukan');
    }
    fs.readFile(path.join(__dirname, 'game.html'), (err, html) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('File game.html tidak ditemukan di folder server.');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(html);
    });
});

const wss = new WebSocketServer({ server, maxPayload: 65536, perMessageDeflate: false });
// Room hanya disimpan di memori, untuk percobaan pada jaringan tepercaya.
const rooms = new Map();
const heroIds = new Set(['Dummies','BladeDancer','Mathemathing','Gravity','Wemmball','Vexen','Bane','Gloo','Fakhmolitionator','Amat','Deadbibi','PakParkir','Bakso','Bantal','Nyamuk','Sandal','Phantom']);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function send(socket, message) {
    if (socket && socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 262144) socket.send(JSON.stringify(message));
}
function newCode() {
    for (let i = 0; i < 100; i++) {
        let code = '';
        for (let j = 0; j < 4; j++) code += alphabet[randomInt(alphabet.length)];
        if (!rooms.has(code)) return code;
    }
    return null;
}
function leave(socket) {
    const code = socket.room;
    const room = code && rooms.get(code);
    socket.room = null;
    if (!room) return;
    if (room.host === socket) {
        rooms.delete(code);
        if (room.guest) { room.guest.room = null; send(room.guest, { type: 'room_closed' }); }
    } else if (room.guest === socket) {
        room.guest = null; room.playing = false; room.heroes[1] = 'Fakhmolitionator';
        send(room.host, { type: 'peer_left', code, heroes: room.heroes });
    }
}
wss.on('connection', (socket, request) => {
    if (request.url !== '/room' || wss.clients.size > 100) { socket.close(1008, 'Tidak tersedia'); return; }
    socket.alive=true;socket.on('pong',()=>{socket.alive=true});
    socket.rateAt=Date.now();socket.rateCount=0;socket.lastJoin=0;
    socket.on('message', (data, isBinary) => {
        if (isBinary) return;
        const now=Date.now();if(now-socket.rateAt>=1000){socket.rateAt=now;socket.rateCount=0;}
        if(++socket.rateCount>100){socket.close(1008,'Terlalu banyak pesan');return;}
        let msg;
        try { msg = JSON.parse(data.toString()); } catch (_) { send(socket, { type: 'error', message: 'Pesan tidak valid.' }); return; }
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'leave') { leave(socket); send(socket, { type: 'left' }); return; }
        if (msg.type === 'create') {
            if (socket.room) { send(socket, { type: 'error', message: 'Keluar dari room saat ini dulu.' }); return; }
            if(rooms.size>=40){send(socket,{type:'error',message:'Server sedang penuh. Coba lagi nanti.'});return;}
            const code = newCode();
            if (!code) { send(socket, { type: 'error', message: 'Room penuh. Coba lagi.' }); return; }
            rooms.set(code, { host: socket, guest: null, playing: false, heroes: ['Fakhmolitionator','Fakhmolitionator'] }); socket.room = code;
            send(socket, { type: 'created', code, role: 'host', count: 1, heroes: rooms.get(code).heroes });
        } else if (msg.type === 'join') {
            if (socket.room) { send(socket, { type: 'error', message: 'Keluar dari room saat ini dulu.' }); return; }
            if(now-socket.lastJoin<750){send(socket,{type:'error',message:'Tunggu sebentar sebelum mencoba kode lagi.'});return;}socket.lastJoin=now;
            const code = typeof msg.code === 'string' ? msg.code.toUpperCase().trim() : '';
            const room = /^[A-Z2-9]{4}$/.test(code) ? rooms.get(code) : null;
            if (!room) { send(socket, { type: 'error', message: 'Kode room tidak ditemukan.' }); return; }
            if (room.guest) { send(socket, { type: 'error', message: 'Room sudah penuh.' }); return; }
            room.guest = socket; socket.room = code;
            send(socket, { type: 'joined', code, role: 'guest', count: 2, heroes: room.heroes });
            send(room.host, { type: 'peer_joined', code, count: 2, heroes: room.heroes });
        } else if (msg.type === 'choose_hero') {
            const room = rooms.get(socket.room);
            if (!room || room.playing || !heroIds.has(msg.hero)) { send(socket, {type:'error', message:'Hero tidak dapat dipilih saat ini.'}); return; }
            const index = room.host === socket ? 0 : room.guest === socket ? 1 : -1;
            if (index < 0) return;
            room.heroes[index] = msg.hero;
            send(room.host, {type:'heroes', heroes:room.heroes}); send(room.guest, {type:'heroes', heroes:room.heroes});
        } else if (msg.type === 'start_test') {
            const room = rooms.get(socket.room);
            if (!room || room.host !== socket || !room.guest) { send(socket, {type: 'error', message: 'Host memerlukan dua pemain.'}); return; }
            if (room.playing) return;
            // Host mengirim geometri map persis seperti di mode arena game.
            const walls = msg.walls;
            if (!Array.isArray(walls) || walls.length === 0 || walls.length > 80 ||
                !walls.every(w => w && ['x','y','w','h'].every(k => Number.isFinite(w[k])) &&
                    w.x >= 0 && w.y >= 0 && w.w > 0 && w.h > 0 && w.x + w.w <= 900 && w.y + w.h <= 900)) {
                send(socket, {type:'error', message:'Data map tidak valid.'}); return;
            }
            const cleanWalls = walls.map(w => ({x:w.x,y:w.y,w:w.w,h:w.h}));
            const name = typeof msg.mapName === 'string' ? msg.mapName.slice(0,40) : 'ARENA';
            room.playing = true;
            const start = {type:'test_started', walls:cleanWalls, mapName:name, heroes:room.heroes.slice()};
            send(room.host, start); send(room.guest, start);
        } else if (msg.type === 'stop_test') {
            const room = rooms.get(socket.room);
            if (!room || !room.playing) return;
            room.playing = false;
            send(room.host, {type: 'test_stopped'}); send(room.guest, {type: 'test_stopped'});
        } else if (msg.type === 'input') {
            const room = rooms.get(socket.room);
            if (!room || !room.playing || room.guest !== socket || !Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
            let x = Math.max(-1, Math.min(1, msg.x)), y = Math.max(-1, Math.min(1, msg.y));
            const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
            send(room.host, {type: 'input', x, y});
        } else if (msg.type === 'action') {
            const room = rooms.get(socket.room);
            if (!room || !room.playing || room.guest !== socket || !['skill','skill2','ult'].includes(msg.action)) return;
            if (msg.action === 'skill' && !Number.isFinite(msg.angle)) return;
            send(room.host, {type:'action', action:msg.action, angle:msg.action === 'skill' ? Math.atan2(Math.sin(msg.angle), Math.cos(msg.angle)) : 0});
        } else if (msg.type === 'battle_state') {
            // Server meneruskan snapshot host hanya ke tamu di room yang sama.
            // Struktur dibatasi agar tidak ada payload tak terbatas di LAN.
            const room = rooms.get(socket.room), ps = msg.players;
            if (!room || !room.playing || room.host !== socket || !Array.isArray(ps) || ps.length !== 2 ||
                !ps.every(p => p && typeof p === 'object' && typeof p.data === 'object' && p.data !== null) ||
                !Array.isArray(msg.shots) || msg.shots.length > 100 ||
                !Array.isArray(msg.effects) || msg.effects.length > 80) return;
            send(room.guest, {type:'battle_state', players:ps, shots:msg.shots, effects:msg.effects,
                winner:['P1','P2','DRAW'].includes(msg.winner)?msg.winner:null});
        } else if (msg.type === 'state') {
            const room = rooms.get(socket.room), p = msg.positions;
            if (!room || !room.playing || room.host !== socket || !Array.isArray(p) || p.length !== 4 || !p.every(Number.isFinite)) return;
            send(room.guest, {type: 'state', positions: p.map(v => Math.max(0, Math.min(900, v)))});
        } else {
            send(socket, { type: 'error', message: 'Perintah belum tersedia.' });
        }
    });
    socket.on('error', err => console.log('Koneksi bermasalah:', err.message));
    socket.on('close', () => leave(socket));
});
server.on('error', err => console.error('Server gagal:', err.message));
const pingTimer=setInterval(()=>{for(const socket of wss.clients){if(!socket.alive){socket.terminate();continue;}socket.alive=false;socket.ping();}},30000);
server.on('close',()=>clearInterval(pingTimer));
const port=Number(process.env.PORT)||3000;
server.listen(port, '0.0.0.0', () => console.log('Ball Fight Online siap di port '+port));
