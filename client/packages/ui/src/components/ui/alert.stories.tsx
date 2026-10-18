import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@bi-metrics/ui/components/ui/alert"

const meta = {
  title: "UI/Alert",
  component: Alert,
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "destructive"] },
  },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Query finished</AlertTitle>
      <AlertDescription>1,024 rows returned in 0.42s.</AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Destructive: Story = { args: { variant: "destructive" } }
