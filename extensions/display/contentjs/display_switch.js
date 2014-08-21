$(document).ready(function(){$("body").hide().fadeIn(1000);});

var slinkyRosDisplay = new ROSLIB.Ros({
  url: 'wss://42-b:9090'
});

var displaySwitchTopic = new ROSLIB.Topic({
  ros: slinkyRosDisplay,
  name: '/display/switch',
  messageType: 'std_msgs/String',
});

displaySwitchTopic.subscribe(function(msg){
  var url = msg.data;

  // the below line causes the white flickering
  // $('body').fadeOut(2000, function() { document.location = url } );

  document.location = url;
});
