import type { Meta, StoryObj } from "@storybook/react-vite"
import { Label } from "@bi-metrics/ui/components/ui/label"

const meta = {
  title: "UI/Label",
  component: Label,
  args: { children: "Dataset" },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
