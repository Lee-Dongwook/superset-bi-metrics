import type { Meta, StoryObj } from "@storybook/react-vite"
import { PlusIcon } from "lucide-react"
import { Button } from "@bi-metrics/ui/components/ui/button"

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Save chart" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {(["default", "destructive", "outline", "secondary", "ghost", "link"] as const).map(
        (variant) => (
          <Button key={variant} {...args} variant={variant}>
            {variant}
          </Button>
        )
      )}
    </div>
  ),
}

export const Icon: Story = {
  args: { size: "icon", variant: "outline", children: <PlusIcon />, "aria-label": "Add" },
}

export const Disabled: Story = { args: { disabled: true } }
