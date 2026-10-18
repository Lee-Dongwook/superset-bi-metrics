import type { Meta, StoryObj } from "@storybook/react-vite"
import { toast } from "sonner"
import { Button } from "@bi-metrics/ui/components/ui/button"
import { Toaster } from "@bi-metrics/ui/components/ui/sonner"

const meta = {
  title: "UI/Sonner",
  component: Toaster,
  render: (args) => (
    <div className="flex gap-2">
      <Toaster {...args} />
      <Button variant="outline" onClick={() => toast("Chart saved")}>
        Default
      </Button>
      <Button variant="outline" onClick={() => toast.success("Dashboard published")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Query failed")}>
        Error
      </Button>
    </div>
  ),
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
