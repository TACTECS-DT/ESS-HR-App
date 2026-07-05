import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {TasksStackParamList} from './types';

import TaskListScreen from '../screens/tasks/TaskListScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import TimesheetDailyScreen from '../screens/tasks/TimesheetDailyScreen';
import TimesheetWeeklyScreen from '../screens/tasks/TimesheetWeeklyScreen';
import LogTimeScreen from '../screens/tasks/LogTimeScreen';

const Stack = createStackNavigator<TasksStackParamList>();

export default function TasksNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="TaskList" component={TaskListScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="TimesheetDaily" component={TimesheetDailyScreen} />
      <Stack.Screen name="TimesheetWeekly" component={TimesheetWeeklyScreen} />
      <Stack.Screen name="LogTime" component={LogTimeScreen} />
    </Stack.Navigator>
  );
}
