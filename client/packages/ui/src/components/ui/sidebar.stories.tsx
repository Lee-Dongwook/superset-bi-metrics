import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChartPieIcon, DatabaseIcon, LayoutDashboardIcon, TerminalIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@bi-metrics/ui/components/ui/sidebar"

const ITEMS = [
  { title: "Dashboards", icon: LayoutDashboardIcon, badge: 12 },
  { title: "Charts", icon: ChartPieIcon, badge: 48 },
  { title: "Datasets", icon: DatabaseIcon },
  { title: "SQL Lab", icon: TerminalIcon },
]

const meta = {
  title: "UI/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  args: { collapsible: "icon", variant: "sidebar", side: "left" },
  argTypes: {
    collapsible: { control: "inline-radio", options: ["offcanvas", "icon", "none"] },
    variant: { control: "inline-radio", options: ["sidebar", "floating", "inset"] },
    side: { control: "inline-radio", options: ["left", "right"] },
  },
  render: (args) => (
    <SidebarProvider>
      <Sidebar {...args}>
        <SidebarHeader className="px-4 py-3 font-semibold">BI Metrics</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Explore</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ITEMS.map(({ title, icon: Icon, badge }, index) => (
                  <SidebarMenuItem key={title}>
                    <SidebarMenuButton isActive={index === 1} tooltip={title}>
                      <Icon />
                      <span>{title}</span>
                    </SidebarMenuButton>
                    {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-4 py-3 text-xs text-muted-foreground">v0.1.0</SidebarFooter>
      </Sidebar>
      <SidebarInset className="p-4">
        <SidebarTrigger />
      </SidebarInset>
    </SidebarProvider>
  ),
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Floating: Story = { args: { variant: "floating" } }
