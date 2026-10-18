import type { Meta, StoryObj } from "@storybook/react-vite"
import { Badge } from "@bi-metrics/ui/components/ui/badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Certified" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex gap-2">
      <Badge {...args} variant="default" />
      <Badge {...args} variant="secondary" />
      <Badge {...args} variant="destructive" />
      <Badge {...args} variant="outline" />
    </div>
  ),
}
