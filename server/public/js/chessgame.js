const socket = io();
const chess = new Chess();
const boardElement = document.getElementById("board");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const moveSound = new Audio('audio/move.mp3');
const captureSound = new Audio('audio/capture.mp3');
const gameOverSound = new Audio('audio/game_over.webm');

function renderBoard(){
    const board = chess.board();
    boardElement.innerHTML = '';

    board.forEach(function (row, rowIndex) {
        row.forEach(function (square, squareIndex){
            const squareElement = document.createElement('div');
            squareElement.classList.add('square', ((rowIndex + squareIndex) % 2 === 0 ? 'light' : 'dark'));
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square){
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', (square.color === 'w' ? 'white' : 'black'));
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener('dragstart', function (e) {
                    if (pieceElement.draggable){
                        draggedPiece = pieceElement;
                        sourceSquare = {row: rowIndex, col: squareIndex};
                        e.dataTransfer.setData('text/plain', '');
                    }
                })

                pieceElement.addEventListener('dragend', function (e) {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', function (e) {
                e.preventDefault();
            });

            squareElement.addEventListener('drop', function (e) {
                e.preventDefault();

                if (draggedPiece){
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    }

                    handleMove(sourceSquare, targetSource, square);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b'){
        boardElement.classList.add('flipped');
    } else{
        boardElement.classList.remove('flipped');
    }
}

function handleMove(source, target, square){
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97+target.col)}${8 - target.row}`,
        promotion: 'q',
        square: square
    };

    socket.emit('move', move);
}

function getPieceUnicode(piece){
    const unicodePieces = {
        k: '♔',
        q: '♕',
        r: '♖',
        b: '♗',
        n: '♘',
        p: '♙',
    }

    return unicodePieces[piece.type.toLowerCase()] || "";
}

socket.on('playerRole', function(role){
    playerRole = role;
    renderBoard();
});

socket.on('spectatorRole', function(){
    playerRole = null;
    renderBoard();
});

socket.on('boardState', function(fen){
    chess.load(fen);
    renderBoard();
});

socket.on('move', function(move){
    if (!move.square) moveSound.play().then(r => 'moved!');
    chess.move(move);
    renderBoard();
});

socket.on('inCheck', function(player){
    console.log('player', player);
})

socket.on('gameOver', async function(loser){
    await gameOverSound.play();
    console.log(`${loser} has lost the match!`);
})

socket.on('draw', function(drawType){
    console.log(drawType);
});

socket.on('capture', async function(move, movedPlayer, currentPlayer){
    await captureSound.play();
});

renderBoard();
