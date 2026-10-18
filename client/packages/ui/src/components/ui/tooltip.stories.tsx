import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@bi-metrics/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@bi-metrics/ui/components/ui/tooltip"

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  render: (args) => (
    <TooltipProvider>
      <Tooltip {...args}>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Refresh every 5 minutes</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Open: Story = { args: { open: true } }
