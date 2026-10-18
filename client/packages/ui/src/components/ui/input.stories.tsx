import type { Meta, StoryObj } from "@storybook/react-vite"
import { Input } from "@bi-metrics/ui/components/ui/input"

const meta = {
  title: "UI/Input",
  component: Input,
  args: { placeholder: "Search charts", className: "w-72" },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }

export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "abc" } }

export const File: Story = { args: { type: "file" } }
