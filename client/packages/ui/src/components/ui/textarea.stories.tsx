import type { Meta, StoryObj } from "@storybook/react-vite"
import { Textarea } from "@bi-metrics/ui/components/ui/textarea"

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: { placeholder: "SELECT * FROM sales", className: "w-96" },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }
