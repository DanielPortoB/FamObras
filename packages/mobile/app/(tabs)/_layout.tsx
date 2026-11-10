import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Obras",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "construct" : "construct-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: "Funcionários",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
