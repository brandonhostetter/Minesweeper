var Page = {};
// canvas variables
Page.$canvas = null;
Page.context = null;
Page.$infoCanvas = null;
Page.infoContext = null;
Page.canvasWidth = -1;
Page.canvasHeight = -1;
Page.boardSizeX = -1;
Page.boardSizeY = -1;
Page.numberOfMines = -1;
Page.smBoardSize = 9;
Page.mdBoardSize = 16;
Page.lgBoardSizeX = 30;
Page.lgBoardSizeY = 16;
Page.smBoardMines = 10;
Page.mdBoardMines = 40;
Page.lgBoardMines = 99;
Page.blockSize = 27;
Page.blockSpacing = 32;
Page.triangleLength = 8;
Page.startTime = -1;
Page.timerIntervalId = null;
// player
Page.playingField = null;
Page.isGameOver = false;
Page.isGameWon = false;
Page.availableFlags = -1;

Page.initialize = function () {
    Page.$canvas = $('#minesweeper-canvas');
    Page.context = Page.$canvas[0].getContext('2d');
    Page.$infoCanvas = $('#info-canvas');
    Page.infoContext = Page.$infoCanvas[0].getContext('2d');

    Page.initSizeSelection();
    Page.initGameOverModal();
};

//#region Setup

Page.initSmallBoard = function () {
    Page.canvasWidth = 288;
    Page.canvasHeight = 288;
    Page.boardSizeX = Page.smBoardSize;
    Page.boardSizeY = Page.smBoardSize;
    Page.numberOfMines = Page.smBoardMines;
};

Page.initMediumBoard = function () {
    Page.canvasWidth = 512;
    Page.canvasHeight = 512;
    Page.boardSizeX = Page.mdBoardSize;
    Page.boardSizeY = Page.mdBoardSize;
    Page.numberOfMines = Page.mdBoardMines;
};

Page.initLargeBoard = function () {
    Page.canvasWidth = 960;
    Page.canvasHeight = 512;
    Page.boardSizeX = Page.lgBoardSizeX;
    Page.boardSizeY = Page.lgBoardSizeY;
    Page.numberOfMines = Page.lgBoardMines;
};

Page.initSizeSelection = function () {
    // let the user pick the size of the grid
    var $modal = $('#pick-size-modal');
    $modal.find('#beginner-btn').on('click', function () {
        Page.initSmallBoard();
        $('#pick-size-modal').modal('hide');
    });

    $modal.find('#intermediate-btn').on('click', function () {
        Page.initMediumBoard();
        $('#pick-size-modal').modal('hide');
    });

    $modal.find('#expert-btn').on('click', function () {
        Page.initLargeBoard();
        $('#pick-size-modal').modal('hide');
    });

    // continue with initialization now that we know the grid size
    $modal.on('hidden.bs.modal', function (e) {
        Page.$canvas.attr('height', Page.canvasHeight);
        Page.$canvas.attr('width', Page.canvasWidth);
        Page.$infoCanvas.attr('width', Page.canvasWidth);

        Page.availableFlags = Page.numberOfMines;
        Page.playingField = Page.create2DArray(Page.boardSizeX, Page.boardSizeY);
        Page.randomlyDisperseMines();
        Page.findNumberOfNeighboringMines();
        Page.drawBoard();
        Page.attachCanvasListener();
    });

    // show the modal
    $modal.modal({
        backdrop: 'static',
        keyboard: false,
        show: true
    });
};

Page.initGameOverModal = function () {
    $('#game-over-modal').on('show.bs.modal', function (e) {
        $(this).find('#confirm-replay-game').on('click', function () {
            Page.resetGame();
            $('#game-over-modal').modal('hide');
        });
    });
};

//#endregion Setup

//#region Event Listeners

Page.attachCanvasListener = function () {
    // use one-time event to ensure first click doesn't hit a mine and to start the stopwatch
    Page.$canvas.one('mousedown', function (e) {
        var col = Math.floor(e.offsetX / Page.blockSpacing);
        var row = Math.floor(e.offsetY / Page.blockSpacing);

        // left click
        if (e.which === 1) {
            Page.ensureValidFirstClick(col, row);
        }

        Page.startClock();
    });

    Page.$canvas.on('mousedown', function (e) {
        if (Page.isGameOver) return;
        var col = Math.floor(e.offsetX / Page.blockSpacing);
        var row = Math.floor(e.offsetY / Page.blockSpacing);
        var selBlock = Page.playingField[col][row];

        if (!selBlock.hasExpanded) {
            Page.setPlayingField(e.which, col, row);
            Page.checkGameOver(e.which, selBlock);

            if (e.which === 1 && Page.isGameOver) {
                Page.prepareDrawGameOver();
                Page.playingField[col][row].textColor = 'red';
            }

            if (Page.availableFlags === 0 && Page.checkForWinner()) {
                Page.gameOver();
            }

            Page.drawBoard();
        }
    });
};

//#endregion Event Listeners

//#region Canvas Drawing

Page.drawBoard = function () {
    var halfBlockSize = Page.blockSpacing / 2;
    Page.context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    Page.context.save();
    Page.context.shadowBlur = 3;
    Page.context.shadowOffsetX = 1;
    Page.context.shadowOffsetY = 1;

    for (var i = 0; i < Page.boardSizeX; i++) {
        for (var j = 0; j < Page.boardSizeY; j++) {
            var selBlock = Page.playingField[i][j];
            var xCoorRect = Page.blockSpacing * i;
            var yCoorRect = Page.blockSpacing * j;
            var xCoorGrad = halfBlockSize + xCoorRect;
            var yCoorGrad = halfBlockSize + yCoorRect;
            var gradient = Page.context.createRadialGradient(xCoorGrad, yCoorGrad, 0, xCoorGrad, yCoorGrad, halfBlockSize);

            if (selBlock.hasExpanded) {
                // gray expanded blocks
                gradient.addColorStop(0, 'rgba(227, 227, 227, 1)');
                gradient.addColorStop(1, 'rgba(199, 199, 199, 1)');

                Page.context.fillStyle = gradient;
                Page.context.shadowColor = 'transparent';
                Page.drawRoundedRect(xCoorRect, yCoorRect, 2);

                if (selBlock.numberOfMines !== 0 || selBlock.hasMine) {
                    Page.drawText(i, j, selBlock);
                }
            } else if (selBlock.hasFlag) {
                // orange / yellow blocks with flags
                gradient.addColorStop(0, 'rgba(252, 215, 66, 1)');
                gradient.addColorStop(1, 'rgba(236, 188, 14, 1)');

                Page.context.fillStyle = gradient;
                Page.context.shadowColor = 'rgba(236, 188, 14, 1)';
                Page.drawRoundedRect(xCoorRect, yCoorRect, 2);
                Page.drawText(i, j, selBlock);
            } else {
                // unexpanded blocks with or without unsure
                gradient.addColorStop(0, 'rgba(127, 214, 254, 1)');
                gradient.addColorStop(1, 'rgba(91, 170, 254, 1)');

                Page.context.fillStyle = gradient;
                Page.context.shadowColor = 'rgba(91, 170, 254, 1)';
                Page.drawRoundedRect(xCoorRect, yCoorRect, 2);

                if (selBlock.hasUnsure) {
                    Page.drawText(i, j, selBlock);
                }
            }
        }
    }

    Page.context.restore();
};

Page.drawText = function (col, row, selBlock) {
    var offSetX = Page.blockSpacing / 2;
    var offSetY = offSetX;
    var symbol = '';

    Page.context.save();
    Page.context.font = '28px Lato'
    Page.context.textAlign = 'center';
    Page.context.fillStyle = selBlock.textColor;

    if (selBlock.hasFlag) {
        symbol = String.fromCharCode(parseInt('2691', 16));
        offSetY += 7;
        Page.context.fillStyle = 'white';
    } else if (selBlock.hasUnsure) {
        symbol = '?';
        offSetY += 8;
        Page.context.fillStyle = 'white';
    } else if (selBlock.hasMine) {
        symbol = String.fromCharCode(parseInt('2600', 16));
        offSetX -= 2;
        offSetY += 8;
    } else {
        symbol = Page.playingField[col][row].numberOfMines;
        offSetX -= 2;
        offSetY += 8;
    }

    Page.context.fillText(symbol, Page.blockSpacing * col + offSetX, Page.blockSpacing * row + offSetY);
    Page.context.restore();
};

Page.drawRoundedRect = function (x, y, radius) {
    Page.context.beginPath();
    Page.context.moveTo(x + radius, y);
    Page.context.arcTo(x + Page.blockSize, y, x + Page.blockSize, y + Page.blockSize, radius);
    Page.context.arcTo(x + Page.blockSize, y + Page.blockSize, x, y + Page.blockSize, radius);
    Page.context.arcTo(x, y + Page.blockSize, x, y, radius);
    Page.context.arcTo(x, y, x + Page.blockSize, y, radius);
    Page.context.closePath();
    Page.context.fill();
};

Page.prepareDrawGameOver = function () {
    // Expand all unmarked mines so they'll be drawn
    for (var i = 0; i < Page.boardSizeX; i++) {
        for (var j = 0; j < Page.boardSizeY; j++) {
            var selBlock = Page.playingField[i][j];
            if (selBlock.hasMine && !selBlock.hasFlag) {
                selBlock.hasExpanded = true;
                selBlock.hasUnsure = false;
                selBlock.textColor = 'black';
            }
        }
    }
};

Page.drawInfoText = function () {
    // update the time and bomb count
    var time = new Date().getTime() - Page.startTime;
    var formattedTime = Page.formatMilliseconds(time);
    var mineSymbol = String.fromCharCode(parseInt('2600', 16));
    var clockSymbol = String.fromCharCode(parseInt('23F0', 16));
    var offSetX = (Page.availableFlags > 9) ? Page.canvasWidth - 63 : Page.canvasWidth - 48;

    Page.infoContext.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);
    Page.infoContext.font = '25px Lato';
    Page.infoContext.fillStyle = 'white';
    Page.infoContext.fillText(clockSymbol + ' ' + formattedTime, 0, 35);
    Page.infoContext.fillText(mineSymbol + ' ' + Page.availableFlags, offSetX, 35);
};

//#endregion Canvas Drawing

//#region Generation and Checks

Page.placeMine = function () {
    // place a mine randomly throughout the minefield
    while (true) {
        var randomX = Math.floor(Math.random() * Page.boardSizeX);
        var randomY = Math.floor(Math.random() * Page.boardSizeY);
        if (!Page.playingField[randomX][randomY].hasMine) {
            Page.playingField[randomX][randomY].hasMine = true;
            break;
        }
    }
};

Page.ensureValidFirstClick = function (col, row) {
    // don't allow a mine to be hit on the first click
    var selBlock = Page.playingField[col][row];
    if (selBlock.hasMine) {
        // move the mine so that the game doesn't end
        Page.placeMine();
        selBlock.hasMine = false;
        Page.findNumberOfNeighboringMines();
    }
};

Page.randomlyDisperseMines = function () {
    for (var i = 0; i < Page.numberOfMines; i++) {
        Page.placeMine();
    }
};

Page.findNumberOfNeighboringMines = function () {
    // for each block, count the number of mines touching it
    for (var i = 0; i < Page.boardSizeX; i++) {
        for (var j = 0; j < Page.boardSizeY; j++) {
            if (Page.playingField[i][j].hasMine) continue;

            var count = 0;
            // up
            count += (Page.checkIfMineAtLocation(i, j - 1) ? 1 : 0);
            // up left
            count += (Page.checkIfMineAtLocation(i - 1, j - 1) ? 1 : 0);
            // up right
            count += (Page.checkIfMineAtLocation(i + 1, j - 1) ? 1 : 0);
            // left
            count += (Page.checkIfMineAtLocation(i - 1, j) ? 1 : 0);
            // right
            count += (Page.checkIfMineAtLocation(i + 1, j) ? 1 : 0);
            // down
            count += (Page.checkIfMineAtLocation(i, j + 1) ? 1 : 0);
            // down left
            count += (Page.checkIfMineAtLocation(i - 1, j + 1) ? 1 : 0);
            // down right
            count += (Page.checkIfMineAtLocation(i + 1, j + 1) ? 1 : 0);

            Page.playingField[i][j].numberOfMines = count;
            Page.setTextColor(Page.playingField[i][j]);
        }
    }
};

Page.checkIfMineAtLocation = function (col, row) {
    if (col >= 0 && row >= 0 && col < Page.boardSizeX && row < Page.boardSizeY) {
        if (Page.playingField[col][row].hasMine) {
            return true;
        }
    }

    return false;
};

Page.checkExpansion = function (col, row) {
    // recursively expand the grid at the selected point
    if (col < 0 || row < 0 || col >= Page.boardSizeX || row >= Page.boardSizeY) {
        return;
    }

    var selBlock = Page.playingField[col][row];
    if (selBlock.hasExpanded || selBlock.hasMine || selBlock.hasFlag || selBlock.hasUnsure) {
        return;
    }

    selBlock.hasExpanded = true;

    if (selBlock.numberOfMines !== 0) {
        return;
    }

    // up
    Page.checkExpansion(col, row - 1);
    // up left
    Page.checkExpansion(col - 1, row - 1);
    // up right
    Page.checkExpansion(col + 1, row - 1);
    // left
    Page.checkExpansion(col - 1, row);
    // right
    Page.checkExpansion(col + 1, row);
    // down
    Page.checkExpansion(col, row + 1);
    // down left
    Page.checkExpansion(col - 1, row + 1);
    // down right
    Page.checkExpansion(col + 1, row + 1);
};

Page.checkForWinner = function () {
    for (var i = 0; i < Page.boardSizeX; i++) {
        for (var j = 0; j < Page.boardSizeY; j++) {
            var selBlock = Page.playingField[i][j];
            if (selBlock.hasMine && !selBlock.hasFlag) {
                return false;
            }
        }
    }

    Page.isGameWon = true;
    return true;
};

//#endregion Generation and Checks

//#region Helpers

Page.startClock = function () {
    // the stopwatch drifts a bit after a while due to setInterval but it's close enough
    Page.startTime = new Date().getTime();
    Page.drawInfoText();
    Page.timerIntervalId = setInterval(Page.drawInfoText, 1000);
};

Page.stopClock = function () {
    clearInterval(Page.timerIntervalId);
};

Page.formatMilliseconds = function (milliSecs) {
    var curTime;
    var min = (milliSecs / 1000 / 60) << 0; // << 0 is essentially Math.floor
    var sec = (milliSecs / 1000) % 60 << 0;

    if (min < 10) {
        curTime = '0' + min;
    } else {
        curTime = '' + min;
    }

    if (sec < 10) {
        curTime += ':0' + sec;
    } else {
        curTime += ':' + sec;
    }

    return curTime;
};

Page.create2DArray = function (cols, rows) {
    var array = [];
    for (var i = 0; i < cols; i++) {
        array[i] = [];
        for (var j = 0; j < rows; j++) {
            array[i][j] = new Block();
        }
    }
    return array;
};

Page.setPlayingField = function (whichMouse, col, row) {
    var selBlock = Page.playingField[col][row];

    if (whichMouse === 1) {
        // left click
        if (selBlock.hasFlag) {
            Page.availableFlags++;
        }

        selBlock.hasFlag = false;
        selBlock.hasUnsure = false;

        if (selBlock.numberOfMines !== 0) {
            selBlock.hasExpanded = true;
        } else {
            Page.checkExpansion(col, row);
        }
    } else if (whichMouse === 3) {
        // right click
        if (selBlock.hasFlag) {
            // unsure
            selBlock.hasUnsure = true;
            selBlock.hasFlag = false;
            Page.availableFlags++;
        } else if (selBlock.hasUnsure) {
            // no flag or bomb
            selBlock.hasUnsure = false;
            selBlock.hasFlag = false;
        } else {
            // flag
            if (Page.availableFlags > 0) {
                selBlock.hasFlag = true;
                Page.availableFlags--;
            }
        }

        // update prematurely so we don't wait for the next second to update mines left
        Page.drawInfoText();
    }
};

Page.setTextColor = function (selBlock) {
    var count = selBlock.numberOfMines;

    switch (count) {
        case 1:
            selBlock.textColor = 'rgba(1, 0, 253, 1)';
            break;
        case 2:
            selBlock.textColor = 'rgba(1, 127, 1, 1)';
            break;
        case 3:
            selBlock.textColor = 'rgba(253, 0, 0, 1)';
            break;
        case 4:
            selBlock.textColor = 'rgba(1, 0, 127, 1)';
            break;
        case 5:
            selBlock.textColor = 'rgba(128, 1, 2, 1)';
            break;
        case 6:
            selBlock.textColor = 'rgba(0, 127, 128, 1)';
            break;
        case 7:
            selBlock.textColor = 'rgba(0, 0, 0, 1)';
            break;
        case 8:
            selBlock.textColor = 'rgba(127, 127, 127, 1)';
            break;
    }
};

//#endregion Helpers

//#region Reset / Replay

Page.checkGameOver = function (whichMouse, selBlock) {
    if (selBlock.hasMine && whichMouse === 1) {
        Page.gameOver();
        return true;
    }

    return false;
};

Page.gameOver = function (col, row) {
    Page.isGameOver = true;
    Page.stopClock();

    if (Page.isGameWon) {
        $('#game-over-modal').find('.modal-title').text('You Won!');
    } else {
        $('#game-over-modal').find('.modal-title').text('You Blew Up!');
    }

    Page.$canvas.off('mousedown');
    $('#game-over-modal').modal('show');
};

Page.resetGame = function () {
    Page.startTime = -1;
    Page.timerIntervalId = null;
    Page.playingField = null;
    Page.isGameOver = false;
    Page.isGameWon = false;
    Page.availableFlags = -1;

    $('#pick-size-modal').modal({
        backdrop: 'static',
        keyboard: false,
        show: true
    });
};

//#endregion Reset / Replay

// object for each square on the board
var Block = function () {
    this.hasMine = false;
    this.hasFlag = false;
    this.hasUnsure = false;
    this.hasExpanded = false;
    this.numberOfMines = 0;
    this.textColor = 'white';
};

$(document).on('ready', function () {
    Page.initialize();
});
