#!/usr/bin/env python

import rospy
import serial
from sensor_msgs.msg import Range
from std_msgs.msg import Bool


def main():
    distance_pub = rospy.Publisher(
        '/proximity/distance',
        Range,
        queue_size=5
    )
    presence_pub = rospy.Publisher(
        '/proximity/presence',
        Bool,
        queue_size=5
    )
    rospy.init_node('maxbotix')

    device_path = rospy.get_param('~device_path')
    baud_rate = int(rospy.get_param('~baud_rate', 57600))

    sensor = serial.Serial(device_path, baud_rate)

    buf = ''

    while not rospy.is_shutdown():
        distance = 0
        presence = 0

        try:
            char = sensor.read(1)
        except serial.SerialException as e:
            print e
            break

        buf += char
        if char == '\x0d':
            try:
                distance = int(buf[1:4])
                presence = int(buf[6])
            except ValueError as e:
                pass
            else:
                distance_msg = Range()
                distance_msg.range = distance * 0.0254
                distance_msg.header.stamp = rospy.Time.now()
                distance_pub.publish(distance_msg)

                presence_msg = Bool()
                presence_msg.data = True if presence == 1 else False
                presence_pub.publish(presence_msg)
            finally:
                buf = ''

if __name__ == '__main__':
    try:
        main()
    except rospy.ROSInterruptException:
        pass

# vim: tabstop=8 expandtab shiftwidth=4 softtabstop=4
