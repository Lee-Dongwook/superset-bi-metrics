import type { ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@bi-metrics/ui/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@bi-metrics/ui/components/ui/sheet"

type Side = "top" | "right" | "bottom" | "left"

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  args: { side: "right" as Side },
  argTypes: {
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
  },
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Chart properties</SheetTitle>
          <SheetDescription>Edit name, owners and cache timeout.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Save</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<ComponentProps<typeof Sheet> & { side: Side }>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
