#include "ros/ros.h"
#include <linux/input.h>
#include <fcntl.h>
#include <stdio.h>
#include <string>

#include "evdev_teleport/EvdevEvent.h"

const double SLEEP_DURATION = 0.0001; // seconds

int main(int argc, char** argv) {

  /* initialize ros */

  ros::init(argc, argv, "evdev_teleport_sender");

  ros::NodeHandle n("~");

  ros::Publisher evdev_pub =
    n.advertise<evdev_teleport::EvdevEvent>("/evdev_teleport/event", 100);

  /* open the device */

  std::string device_path;
  int device_fd;

  n.param<std::string>(
    "device_path",
    device_path,
    "/dev/input/by-id/usb-PIXART_USB_OPTICAL_MOUSE-event-mouse"
  );

  if ((device_fd = open(device_path.c_str(), O_RDONLY | O_NONBLOCK)) < 0) {
    perror("opening the file you specified");
    ros::shutdown();
  }

  /* begin relaying from the device to the topic */

  while(ros::ok()) {
    struct input_event ev;
    struct input_event *event_data = &ev;
    evdev_teleport::EvdevEvent msg;

    int num_read = read(device_fd, event_data, sizeof(ev));

    if (sizeof(ev) != num_read) {
      // don't spin until all events have been read
      ros::spinOnce();
      ros::Duration(SLEEP_DURATION).sleep();
      continue;
    }

    if (event_data->type == EV_SYN)
      continue; // ignore EV_SYN events

    msg.type = event_data->type;
    msg.code = event_data->code;
    msg.value = event_data->value;

    evdev_pub.publish(msg);

    ROS_DEBUG(
      "published type: %d code: %d value: %d\n",
      event_data->type, event_data->code, event_data->value
    );

  }
}
