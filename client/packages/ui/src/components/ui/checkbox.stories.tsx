import type { Meta, StoryObj } from "@storybook/react-vite"
import { Checkbox } from "@bi-metrics/ui/components/ui/checkbox"
import { Label } from "@bi-metrics/ui/components/ui/label"

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="show-legend" {...args} />
      <Label htmlFor="show-legend">Show legend</Label>
    </div>
  ),
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }

export const Disabled: Story = { args: { disabled: true } }
