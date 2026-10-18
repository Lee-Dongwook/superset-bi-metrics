import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@bi-metrics/ui/components/ui/table"

const ROWS = [
  { country: "USA", sales: 5800 },
  { country: "Korea", sales: 4200 },
  { country: "Japan", sales: 3100 },
  { country: "Germany", sales: 2400 },
]

const meta = {
  title: "UI/Table",
  component: Table,
  render: (args) => (
    <div className="w-96">
      <Table {...args}>
        <TableCaption>Sales by country</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">Sales</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map(({ country, sales }) => (
            <TableRow key={country}>
              <TableCell>{country}</TableCell>
              <TableCell className="text-right">{sales.toLocaleString("en-US")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell className="text-right">
              {ROWS.reduce((sum, { sales }) => sum + sales, 0).toLocaleString("en-US")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  ),
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
