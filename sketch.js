var mic, osc, soundFile;
var currentSource = 'mic';

var fft;
var binCount = 1024;
var bins = new Array(binCount);
var scaleChanged = true;
var samples = [];
var old_samples = [];
var old_sample_offset = 0;
var selectedBin;


function preload() {
}

function setup() {
  var cnv = createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB);

  soundFile = loadSound('music/Broke_For_Free_-_01_-_As_Colorful_As_Ever.mp3')
  mic = new p5.AudioIn();
  osc = new p5.Oscillator();
  osc.amp(0.3);
  osc.freq(300);

  var smoothing = 0.6;
  fft = new p5.FFT(smoothing, binCount);

  for (var i = 0; i < binCount; i++) {
    bins[i] = new Bin(i, binCount);
  }

  toggleInput(1);
}

function draw() {
  background(0);

  var spectrum = fft.analyze();

  if (scaleChanged) {
    scaleChanged = false;
    if (logView) {
      for (var i = 0; i < binCount; i++) {
        bins[i].setLogPosition(i, binCount);
      }
    }
    else {
      for (var i = 0; i < binCount; i++) {
        bins[i].setLinPosition(i, binCount);
      }
    }
    mouseMoved();
  }

  for (var i = 0; i < binCount; i++) {
    bins[i].draw(spectrum[i]);
  }

  samples = fft.waveform();
  var bufLen = samples.length;

  // shift horizontal time offset to minimize drift of the waveform from one sample to the next
  var best_offset = 0;
  var best_sample_diff = -1;
  for(var i=0;i<bufLen/2;i++) {
    sample_diff = sampleDiff(i,samples,old_sample_offset,old_samples);
    if( best_sample_diff < 0 || sample_diff < best_sample_diff) {
      best_sample_diff = sample_diff;
      best_offset = i;
    }
  }

  // draw snapshot of the samples
  noFill();
  stroke(0,0,150,0.7);
  strokeWeight(4);
  beginShape();
  var points = bufLen-Math.max(best_offset,bufLen/2);
  for (var i = 0; i < points; i++) {
    var x = map(i, 0, points, 0, width);
    var y = map(samples[i+best_offset], -1, 1, -height/4, height/4);
    vertex(x, y + height/4);
  }
  endShape();
  noStroke();
  old_samples = samples;
  old_sample_offset = best_offset;
  var timespan = String(Math.round(points/sampleRate()*1000)/1000);
  fill(255);
  textSize(18);
  textAlign(RIGHT,TOP);
  text(timespan + "s    ",width,height/4+4);
  textAlign(LEFT,BOTTOM);

  labelStuff();
}

function sampleDiff(sample1_offset,sample1,sample2_offset,sample2) {
  var sum_errs = 0;
  var n = 0;
  for(var i=0;i<sample1.length;i++) {
    if( i + sample1_offset >= sample1.length ) break;
    if( i + sample2_offset >= sample2.length ) break;
    var err = sample1[i+sample1_offset]-sample2[i+sample2_offset];
    sum_errs += err*err;
    n++;
  }
  return sum_errs/n;
}


// draw text
function labelStuff() {
  textSize(18);
  if (selectedBin) {
    fill("blue");
    text(selectedBin.freq + 'Hz', mouseX+10, mouseY );
    osc.freq(selectedBin.freq);
  }

  fill(255);
  text('Current sound source: ' + currentSource, width/2, 40);
  textSize(14);
  text('Click to switch sound sources', width/2, 60);

  // fft x-axis tick marks
  var next_freq = bins[bins.length/128].freq;
  if( next_freq < 1 ) next_freq = 100;
  var last_x = -1000;
  var unit = "Hz";
  for (var i = 0; i < bins.length-1; i++) {
    var err = bins[i].freq-next_freq;
    err *= err;
    var next_err = bins[i+1].freq-next_freq;
    next_err *= next_err;
    if( err < next_err ) {
      // this is the closest bin to next_freq
      rect(bins[i].x, height, 2, -20 );
      if( bins[i].x-last_x > 30 ) { // avoid overlapping labels
        text(bins[i].freq + unit,bins[i].x, height-20);
        unit = ""; // only display units on the first label
      }
      next_freq *= 2;
      last_x = bins[i].x;
    }
  }
}



// ============
// Window Resize
// ============
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
  scaleChanged = true;
}

// ============
// toggle input
// ============

// in p5, keyPressed is not case sensitive, but keyTyped is
function keyPressed() {
  if (key == 'T') {
    toggleInput();
  }
  if (key == 'L') {
    console.log('l');
    toggleScale();
  }
}

function mouseClicked() {
  toggleInput();
}

// start with mic as input
var inputMode = 1;

function toggleInput(mode) {
  if (typeof(mode) === 'number') {
    inputMode = mode;
  } else {
    inputMode += 1;
    inputMode = inputMode % 6;
  }
  switch (inputMode) {
    case 0: // soundFile mode
      soundFile.loop();
      osc.stop();
      mic.stop();
      fft.setInput(soundFile);
      currentSource = 'soundFile';
      break;
    case 1: // mic mode
      mic.start();
      soundFile.pause();
      fft.setInput(mic);
      currentSource = 'mic';
      break;
    case 2: // sine mode
      osc.setType('sine');
      osc.start();
      soundFile.pause();
      mic.stop();
      fft.setInput(osc);
      currentSource = 'sine';
      break;
    case 3: // square mode
      osc.setType('triangle');
      currentSource = 'triangle';
      break;
    case 4: // square mode
      osc.setType('square');
      currentSource = 'square';
      break;
    case 5: // square mode
      osc.setType('sawtooth');
      currentSource = 'sawtooth';
      break;
  }
}

var logView = true;
function toggleScale() {
  logView = !logView;
  scaleChanged = true;
}

function mouseMoved() {
  if( mouseX || mouseY ) {
    for (var i = 0; i < bins.length; i++) {
      if ( bins[i].x <= mouseX && mouseX <= (bins[i].x + bins[i].width) ) {
        bins[i].isTouching = true;
      }
      else {
        bins[i].isTouching = false;
      }
    }
  }
}

// ==========
// Bin Class
// ==========

var Bin = function(index, totalBins) {
  // maybe redundant
  this.index = index;
  this.totalBins = totalBins;
  this.color = color( map(this.index, 0, this.totalBins, 0, 255), 255, 255 );

  this.isTouching = false;
  this.x;
  this.width;
  this.value;
  var nyquist = sampleRate() / 2.0;
  this.freq = Math.round( this.index * nyquist / this.totalBins );
}

Bin.prototype.setLogPosition = function(i, totalBins) {
  this.x = map(Math.log(i+1), 0, Math.log(totalBins+1), 0, width - 200);
  this.width = map(Math.log(i+2), 0, Math.log(totalBins+1), 0, width - 200)-this.x;
}

Bin.prototype.setLinPosition = function(i, totalBins) {
  this.x = map(i, 0, totalBins-1, 0, width - 200);
  this.width = width/totalBins;
}

Bin.prototype.draw = function(value) {
  var h = map(value, 0, 255, height, 0)- height;
  this.value = value;

  if (this.isTouching) {
    selectedBin = this;
    fill(100)
  } else {
    fill( this.color);
  }
  rect(this.x, height, this.width, h );
}
