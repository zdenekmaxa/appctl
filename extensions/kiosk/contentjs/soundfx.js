/**
 * Deal with loading and playing audio clips in response to requested movements.
 */

/**
 * Container for single sound effect, able to isolate a section and/or loop.
 * TODO(arshan): Should we support end < begin by looping past the end?
 * TODO(arshan): What is the floor for durationMs?
 * NOTE: see the sox output for the wav clips at the bottom of file.
 * @constructor
 * @param {string} src_file
 * @param {int} begin
 * @param {int} end
 * @param {bool} loop
 */
SoundEffect = function(src_file, begin, end, loop) {

  this.startMs = begin;
  this.durationMs = end - begin;

  // Prepare the audio resource.
  this.audio = new Audio(src_file);
  this.audio.preload = 'auto';
  this.audio.loop = loop;
  this.loop = false;
  this.event_thread = 0;
  this.playing = false;

  // support crossfade
  this.xfade = 0;
  this.xratio = 0;
  this.xincr = 0.05;
  this.xstep = 100;
  this.crossfading = false;
  // Keep track of the event thread for the cross fading.
  this.xthread = 0;
};

/**
 * Change the volume of the clip.
 * @param {float} float_val
 */
SoundEffect.prototype.setVolume = function(float_val) {
  float_val = Math.max(0, Math.min(1, float_val));
  this.audio.volume = float_val;
};

/**
 * Support to crossfade the soundeffect to a different audio clip.
 * Moves from one to the other symetrically over time.
 * @param {SoundEffect} fx The effect to fade to.
 * @param {float} incr How much to slide from one to the other.
 * @param {int} step The duration of time in ms to take per step.
 * @param {int} offset How long to wait in ms before starting.
 */
SoundEffect.prototype.crossfadeTo = function(fx, incr, step, offset) {
  if (typeof offset === 'undefined') offset = 0;

  this.xfade = fx;
  this.xratio = 0;
  this.xincr = incr;
  this.xstep = step;

  fx.stop();
  fx.setVolume(0);
  fx.start();

  // Crossfade maybe janky to any loop that is too short a clip
  // since the clip will be over.
  this.crossfading = true;
  var self = this;
  this.xthread = setTimeout(function() {
    self.xfade_();
  }, offset);
};

/**
 * Internal call for crossfading.
 * @private
 */
SoundEffect.prototype.xfade_ = function() {
  var self = this;
  this.xthread = setTimeout(function() {
    self.xratio += self.xincr;
    self.setVolume(1 - self.xratio);
    self.xfade.setVolume(self.xratio);
    if (self.xratio < 1.0) {
      self.xfade_();
    }
    else {
      // The crossfade is done.
      self.stop();
      self.setVolume(1);
      self.crossfading = false;
    }
  }, this.xstep);
};

/**
 * If a looping effect this will play indefinitely, otherwise it will
 * naturally stop at the end time.
 */
SoundEffect.prototype.start = function() {
  // If clip is looping just let it keep playing.
  // Should this behaviour hold true for non-loop clips?
  if (this.playing) return;
  this.playing = true;
  this.start_();
};

/**
 * Internal call for running the clip.
 * @private
 */
SoundEffect.prototype.start_ = function() {
  if (this.audio.readyState == 0) return; // Consider an error
  this.audio.currentTime = this.startMs / 1000;
  var self = this;
  this.event_thread = setTimeout(function() {
    self.loop ? self.start_() : self.stop();
  }, this.durationMs);
  this.audio.play();
};

/**
 * Premptive stop of the audio clip.
 */
SoundEffect.prototype.stop = function() {
  this.audio.pause();
  this.playing = false;
  this.crossfading = false;
  // NOTE: might have to stop the crossfade target too?
  clearTimeout(this.event_thread);
};

// Keep track of the state of the user.
var UserState = {
  IDLE:0,
  STARTING:1,
  FLYING:2,
  STOPPING:3,
  BOOST:4
};

SoundFX = function() {
  this.lastVelocity = 0;
  this.state = UserState.IDLE;

  // Preload the sound clips.
  // TODO(arshan): Better to load these out of a config file?
  this.largestart = new SoundEffect(
    chrome.extension.getURL('sounds/largestart.wav'),
                            0, 1217, false);
  this.largeidle = new SoundEffect(
    chrome.extension.getURL('sounds/largeidle.wav'),
                            0, 27282, true);
  this.smallstart = new SoundEffect(
    chrome.extension.getURL('sounds/smallstart.wav'),
                            0, 2000, false);
  this.smallidle = new SoundEffect(
    chrome.extension.getURL('sounds/smallidle.wav'),
                             0, 14003, true);
  this.cutoff = new SoundEffect(
    chrome.extension.getURL('sounds/cutoff.wav'),
                             0, 1994, false);

};

/**
 * Respond to the normalized joystick twist message, with sound if appropriate.
 * @param {Object} twist The ROS twist msg object.
 */
SoundFX.prototype.handlePoseChange = function(twist) {

  // Check boundary conditions.
  // TODO(arshan): Where can we get the altitude for the ground collision?
  // TODO(arshan): Also need the raw altitude values for change in atmosphere.
  x = twist.linear.x;
  y = twist.linear.y;
  z = twist.linear.z;
  val = Math.sqrt(z * z + Math.sqrt(x * x + y * y));

  // Now play the corresponding sound effects.
  // TODO: add timing of state change to debounce.
  switch (this.state) {
  case UserState.IDLE:
    if (val > .3) {
      this.smallstart.start();
      this.smallidle.start();
      this.state = UserState.STARTING;
    }
    break;
  case UserState.BOOST:
    if (val > .2) {
      this.largestart.crossfadeTo(this.largeidle, .05, 100, 300);
      this.state = UserState.FLYING;
    }
    break;
  case UserState.STARTING:
    if (val > .5) {
      this.smallstart.crossfadeTo(this.largestart, .1, 100, 0);
      this.state = UserState.BOOST;
    }
    else if (val > .2) {
      this.smallstart.crossfadeTo(this.largeidle, .05, 100, 200);
      this.state = UserState.FLYING;
    }
    break;
  case UserState.FLYING:
    if (val < .1) {
      this.state = UserState.STOPPING;
    }
    break;
  case UserState.STOPPING:
    if (val < .05) {
      this.largeidle.crossfadeTo(this.cutoff, .05, 100, 0);
      this.state = UserState.IDLE;
    }
    break;
  }
};

/*
Just for informations sake, and possibly fingerprinting, the sox output
for the clips used in the sound effects.

>> sox largeidle.wav -n stat
Samples read:           2619096
Length (seconds):     27.282250
Scaled by:         2147483647.0
Maximum amplitude:     0.474805
Minimum amplitude:    -0.538968
Midline amplitude:    -0.032082
Mean    norm:          0.070921
Mean    amplitude:     0.000013
RMS     amplitude:     0.090059
Maximum delta:         0.114961
Minimum delta:         0.000000
Mean    delta:         0.019609
RMS     delta:         0.024728
Rough   frequency:         2097
Volume adjustment:        1.855

>> sox largestart.wav -n stat
Samples read:            116920
Length (seconds):      1.217917
Scaled by:         2147483647.0
Maximum amplitude:     1.000000
Minimum amplitude:    -0.833501
Midline amplitude:     0.083250
Mean    norm:          0.132635
Mean    amplitude:    -0.002388
RMS     amplitude:     0.188895
Maximum delta:         0.460690
Minimum delta:         0.000000
Mean    delta:         0.026345
RMS     delta:         0.040748
Rough   frequency:         1647
Volume adjustment:        1.000

>> sox smallidle.wav -n stat
Samples read:           1344348
Length (seconds):     14.003625
Scaled by:         2147483647.0
Maximum amplitude:     0.051898
Minimum amplitude:    -0.041315
Midline amplitude:     0.005291
Mean    norm:          0.010027
Mean    amplitude:     0.000019
RMS     amplitude:     0.012588
Maximum delta:         0.017117
Minimum delta:         0.000000
Mean    delta:         0.002672
RMS     delta:         0.003365
Rough   frequency:         2041
Volume adjustment:       19.269

>> sox smallstart.wav -n stat
Samples read:            192000
Length (seconds):      2.000000
Scaled by:         2147483647.0
Maximum amplitude:     0.399003
Minimum amplitude:    -0.308831
Midline amplitude:     0.045086
Mean    norm:          0.032232
Mean    amplitude:    -0.000193
RMS     amplitude:     0.052041
Maximum delta:         0.102391
Minimum delta:         0.000000
Mean    delta:         0.006791
RMS     delta:         0.011959
Rough   frequency:         1755
Volume adjustment:        2.506

>>  sox cutoff.wav -n stat
Samples read:            191424
Length (seconds):      1.994000
Scaled by:         2147483647.0
Maximum amplitude:     0.159753
Minimum amplitude:    -0.160580
Midline amplitude:    -0.000413
Mean    norm:          0.023638
Mean    amplitude:    -0.000226
RMS     amplitude:     0.033527
Maximum delta:         0.133299
Minimum delta:         0.000000
Mean    delta:         0.017119
RMS     delta:         0.024671
Rough   frequency:         5621
Volume adjustment:        6.227

*/