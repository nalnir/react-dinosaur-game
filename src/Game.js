/**
 * Created by LzxHahaha on 2016/10/6.
 */

import React from 'react';

import cloud from './img/cloud.png'; // eslint-disable-line import/no-webpack-loader-syntax
import ground from './img/ground.png'; // eslint-disable-line import/no-webpack-loader-syntax
import obstacle from './img/obstacle.png'; // eslint-disable-line import/no-webpack-loader-syntax

import motocross from './img/motocross.png'; // eslint-disable-line import/no-webpack-loader-syntax
import motocrossDown from './img/motocross-down.png'; // eslint-disable-line import/no-webpack-loader-syntax
import motocrossUp from './img/motocross-up.png'; // eslint-disable-line import/no-webpack-loader-syntax
import motocrossDie from './img/motocross-death.png'; // eslint-disable-line import/no-webpack-loader-syntax

import santa from './img/santa.png';
import santaDown from './img/santa-down.png'
import santaUp from './img/santa-up.png'
import santaDie from './img/santa-die.png'

import frikki from './img/frikki.png';
import frikkiDown from './img/frikki-down.png'
import frikkiUp from './img/frikki-up.png'
import frikkiDie from './img/frikki-die.png'

const STATUS = {
  STOP: 'STOP',
  START: 'START',
  PAUSE: 'PAUSE',
  OVER: 'OVER'
};

const JUMP_DELTA = 5;
const JUMP_MAX_HEIGHT = 53;

export default class Game extends React.Component {
  constructor(props) {
    super(props);

    let imageLoadCount = 0;
    let onImageLoaded = () => {
      ++imageLoadCount;
      if (imageLoadCount === 3) {
        this.__draw();
      }
    };

    // 资源文件
    var currentDate = new Date();
    var currentMonth = currentDate.getMonth();

    let skyImage = new Image();
    let groundImage = new Image();
    let playerImage = new Image();
    let playerLeftImage = new Image();
    let playerRightImage = new Image();
    let playerDieImage = new Image();
    let obstacleImage = new Image();

    skyImage.onload = onImageLoaded;
    groundImage.onload = onImageLoaded;
    playerImage.onload = onImageLoaded;

    skyImage.src = cloud;
    groundImage.src = ground;
    playerImage.src = motocross;
    playerLeftImage.src = motocrossDown;
    playerRightImage.src = motocrossUp;
    playerDieImage.src = motocrossDie;
    obstacleImage.src = obstacle;

    if(currentMonth === 0 || currentMonth === 1 || currentMonth === 2 || currentMonth === 11) {
      playerImage.src = santa;
      playerLeftImage.src = santaDown;
      playerRightImage.src = santaUp;
      playerDieImage.src = santaDie;
    } else if (currentMonth === 3 || currentMonth === 4 || currentMonth === 5 || currentMonth === 6) {
      playerImage.src = motocross;
      playerLeftImage.src = motocrossDown;
      playerRightImage.src = motocrossUp;
      playerDieImage.src = motocrossDie;
    }  else {
      playerImage.src = frikki;
      playerLeftImage.src = frikkiDown;
      playerRightImage.src = frikkiUp;
      playerDieImage.src = frikkiDie;
    }

    this.options = {
      fps: 60,
      skySpeed: 40,
      groundSpeed: 100,
      skyImage: skyImage,
      groundImage: groundImage,
      playerImage: [playerImage, playerLeftImage, playerRightImage, playerDieImage],
      obstacleImage: obstacleImage,
      skyOffset: 0,
      groundOffset: 0,
      ...this.props.options
    };

    this.status = STATUS.STOP;
    this.timer = null;
    this.score = 0;
    this.highScore = window.localStorage ? window.localStorage['highScore'] || 0 : 0;
    this.jumpHeight = 0;
    this.jumpDelta = 0;
    this.obstaclesBase = 1;
    this.obstacles = this.__obstaclesGenerate();
    this.currentDistance = 0;
    this.playerStatus = 0;
  }

  componentDidMount() {
    if (window.innerWidth >= 680) {
      this.canvas.width = 680;
    }

    const onSpacePress = () => {
      switch (this.status) {
        case STATUS.STOP:
          this.start();
          break;
        case STATUS.START:
          this.jump();
          break;
        case STATUS.OVER:
          this.restart();
          break;
      }
    };

    window.onkeypress = function (e) {
      if (e.key === ' ') {
        onSpacePress();
      }
    };
    this.canvas.parentNode.onclick = onSpacePress;

    window.onblur = this.pause;
    window.onfocus = this.goOn;
  }

  componentWillUnmount() {
    window.onblur = null;
    window.onfocus = null;
  }

  __draw() {
    if (!this.canvas) {
      return;
    }

    const { options } = this;

    let level = Math.min(200, Math.floor(this.score / 100));
    let groundSpeed = (options.groundSpeed + level) / options.fps;
    let skySpeed = options.skySpeed / options.fps;
    let obstacleWidth = options.obstacleImage.width;
    let playerWidth = options.playerImage[0].width;
    let playerHeight = options.playerImage[0].height;

    const ctx = this.canvas.getContext('2d');
    const { width, height } = this.canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // 云
    this.options.skyOffset = this.options.skyOffset < width
      ? (this.options.skyOffset + skySpeed)
      : (this.options.skyOffset - width);
    ctx.translate(-this.options.skyOffset, 0);
    ctx.drawImage(this.options.skyImage, 0, 0);
    ctx.drawImage(this.options.skyImage, this.options.skyImage.width, 0);

    // 地面
    this.options.groundOffset = this.options.groundOffset < width
      ? (this.options.groundOffset + groundSpeed)
      : (this.options.groundOffset - width);
    ctx.translate(this.options.skyOffset - this.options.groundOffset, 0);
    ctx.drawImage(this.options.groundImage, 0, 76);
    ctx.drawImage(this.options.groundImage, this.options.groundImage.width, 76);

    // 恐龙
    // 这里已经将坐标还原回左上角
    ctx.translate(this.options.groundOffset, 0);
    ctx.drawImage(this.options.playerImage[this.playerStatus], 80, 64 - this.jumpHeight);
    // 更新跳跃高度/速度
    this.jumpHeight = this.jumpHeight + this.jumpDelta;
    if (this.jumpHeight <= 1) {
      this.jumpHeight = 0;
      this.jumpDelta = 0;
    }
    else if (this.jumpHeight < JUMP_MAX_HEIGHT && this.jumpDelta > 0) {
      this.jumpDelta = (this.jumpHeight * this.jumpHeight) * 0.001033 - this.jumpHeight * 0.137 + 5;
    }
    else if (this.jumpHeight < JUMP_MAX_HEIGHT && this.jumpDelta < 0) {
      // jumpDelta = (jumpHeight * jumpHeight) * 0.00023 - jumpHeight * 0.03 - 4;
    }
    else if (this.jumpHeight >= JUMP_MAX_HEIGHT) {
      this.jumpDelta = -JUMP_DELTA / 2.7;
    }

    // 分数
    let scoreText = (this.status === STATUS.OVER ? 'GAME OVER  ' : '') + Math.floor(this.score);
    ctx.font = "Bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillStyle = "#595959";
    ctx.fillText(scoreText, width - 30, 23);
    if (this.status === STATUS.START) {
      this.score += 0.5;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        window.localStorage['highScore'] = this.score;
      }
      this.currentDistance += groundSpeed;
      if (this.score % 4 === 0) {
        this.playerStatus = (this.playerStatus + 1) % 3;
      }
    }
    if (this.highScore) {
      ctx.textAlign = "left";
      ctx.fillText('HIGH  ' + Math.floor(this.highScore), 30, 23);
    }

    // 障碍
    let pop = 0;
    for (let i = 0; i < this.obstacles.length; ++i) {
      if (this.currentDistance >= this.obstacles[i].distance) {
        let offset = width - (this.currentDistance - this.obstacles[i].distance + groundSpeed);
        if (offset > 0) {
          ctx.drawImage(options.obstacleImage, offset, 84);
        }
        else {
          ++pop;
        }
      }
      else {
        break;
      }
    }
    for (let i = 0; i < pop; ++i) {
      this.obstacles.shift();
    }
    if (this.obstacles.length < 5) {
      this.obstacles = this.obstacles.concat(this.__obstaclesGenerate());
    }

    // 碰撞检测
    let firstOffset = width - (this.currentDistance - this.obstacles[0].distance + groundSpeed);
    if (90 - obstacleWidth < firstOffset
      && firstOffset < 60 + playerWidth
      && 64 - this.jumpHeight + playerHeight > 84) {
      this.stop();
    }

    ctx.restore();
  }

  __obstaclesGenerate() {
    let res = [];
    for (let i = 0; i < 10; ++i) {
      let random = Math.floor(Math.random() * 100) % 60;
      random = (Math.random() * 10 % 2 === 0 ? 1 : -1) * random;
      res.push({
        distance: random + this.obstaclesBase * 200
      });
      ++this.obstaclesBase;
    }
    return res;
  }

  __setTimer() {
    this.timer = setInterval(() => this.__draw(), 1000 / this.options.fps);
  }

  __clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  __clear() {
    this.score = 0;
    this.jumpHeight = 0;
    this.currentDistance = 0;
    this.obstacles = [];
    this.obstaclesBase = 1;
    this.playerStatus = 0;
  }

  start = () => {
    if (this.status === STATUS.START) {
      return;
    }

    this.status = STATUS.START;
    this.__setTimer();
    this.jump();
  };

  pause = () => {
    if (this.status === STATUS.START) {
      this.status = STATUS.PAUSE;
      this.__clearTimer();
    }
  };

  goOn = () => {
    if (this.status === STATUS.PAUSE) {
      this.status = STATUS.START;
      this.__setTimer();
    }
  };

  stop = () => {
    if (this.status === STATUS.OVER) {
      return;
    }
    this.status = STATUS.OVER;
    this.playerStatus = 3;
    this.__clearTimer();
    this.__draw();
    this.__clear();
  };

  restart = () => {
    this.obstacles = this.__obstaclesGenerate();
    this.start();
  };

  jump = () => {
    if (this.jumpHeight > 2) {
      return;
    }
    this.jumpDelta = JUMP_DELTA;
    this.jumpHeight = JUMP_DELTA;
  };

  render() {
    return (
      <canvas id="canvas" ref={ref => this.canvas = ref} height={160} width={340} />
    );
  }
};
