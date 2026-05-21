import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Chess, WHITE, BLACK } from "chess.js";

import { config } from "./config/config.js";

const app = express();
const server = http.createServer(app, {

});

const io = new Server(server, {
    cors: {
        origin: config.ALLOWED_ORIGINS,
        methods: ["GET"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
});

const chess = new Chess();

let players = {};
let currentPlayer = 'w';
let movedPlayer = null;

io.on('connection', function (socket) {
    console.log('Client connected');

    if (!players.white) {
        players.white = socket.id;
        socket.emit('playerRole', 'w');
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit('playerRole', 'b');
    } else {
        socket.emit('spectatorRole');
    }

    socket.on('disconnect', function () {
        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }
    });

    socket.on('move', function (move) {
        try {
            if (chess.turn() === 'w' && socket.id !== players.white) return;
            if (chess.turn() === 'b' && socket.id !== players.black) return;
            if (!(players.white && players.black)) return;

            const result = chess.move(move);

            if (result) {
                movedPlayer = currentPlayer === 'w' ? WHITE : BLACK;
                currentPlayer = chess.turn();
                io.emit('move', move);
                io.emit('boardState', chess.fen());

                if (chess.inCheck()) {
                    io.emit('inCheck', currentPlayer);
                }
                if (chess.isCheckmate()) {
                    io.emit('gameOver', currentPlayer);
                }
                if (chess.isStalemate()) {
                    io.emit('draw', 'stalemate');
                }
                if (chess.isThreefoldRepetition()) {
                    io.emit('draw', 'threefold');
                }
                if (chess.isInsufficientMaterial()) {
                    io.emit('draw', 'insufficientMaterial');
                }

                if (move.square && move.square.color !== movedPlayer) {
                    io.emit('capture', move, movedPlayer, currentPlayer)
                }

            } else {
                console.log(`Invalid Move: ${move}`);
                socket.emit('invalidMove', move);
            }
        }
        catch (e) {
            console.log(e);
            socket.emit('invalidMove', move);
        }
    });
});

server.listen(3000);
