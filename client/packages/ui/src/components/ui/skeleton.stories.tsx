import type { Meta, StoryObj } from "@storybook/react-vite"
import { Skeleton } from "@bi-metrics/ui/components/ui/skeleton"

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  render: (args) => (
    <div className="flex items-center gap-4">
      <Skeleton {...args} className="size-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton {...args} className="h-4 w-60" />
        <Skeleton {...args} className="h-4 w-40" />
      </div>
    </div>
  ),
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
