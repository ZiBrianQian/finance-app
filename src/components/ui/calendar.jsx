import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ru } from "date-fns/locale"
import { addMonths, subMonths, format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    locale = ru,
    month,
    onMonthChange,
    ...props
}) {
    const [internalMonth, setInternalMonth] = React.useState(month || new Date());
    const currentMonth = month || internalMonth;

    const handleMonthChange = React.useCallback((newMonth) => {
        setInternalMonth(newMonth);
        onMonthChange?.(newMonth);
    }, [onMonthChange]);

    // Mouse wheel scrolling for month navigation
    const handleWheel = React.useCallback((e) => {
        e.preventDefault();
        if (e.deltaY > 0) {
            // Scroll down = next month
            const newMonth = addMonths(currentMonth, 1);
            handleMonthChange(newMonth);
        } else if (e.deltaY < 0) {
            // Scroll up = previous month
            const newMonth = subMonths(currentMonth, 1);
            handleMonthChange(newMonth);
        }
    }, [currentMonth, handleMonthChange]);

    return (
        <div
            onWheel={handleWheel}
            className={cn("p-3", className)}
        >
            {/* Custom header without arrows */}
            <div className="flex justify-center mb-4">
                <span className="text-sm font-medium text-foreground capitalize">
                    {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                </span>
            </div>

            <DayPicker
                showOutsideDays={showOutsideDays}
                locale={locale}
                month={currentMonth}
                onMonthChange={handleMonthChange}
                weekStartsOn={1}
                hideNavigation={true}
                modifiersClassNames={{
                    outside: "rdp-day-outside",
                    today: "rdp-day-today",
                    selected: "rdp-day-selected",
                }}
                classNames={{
                    months: "flex flex-col",
                    month: "flex flex-col gap-2",
                    month_caption: "hidden",
                    caption_label: "hidden",
                    nav: "hidden",
                    button_previous: "hidden",
                    button_next: "hidden",
                    month_grid: "w-full border-collapse",
                    weekdays: "flex",
                    weekday: "text-muted-foreground w-9 font-medium text-[0.8rem] text-center",
                    week: "flex w-full mt-2",
                    day: "h-9 w-9 text-center text-sm p-0 relative [&.rdp-day-outside]:opacity-30",
                    day_button: cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-9 w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-foreground"
                    ),
                    selected: "[&.rdp-day-selected]:bg-primary [&.rdp-day-selected]:text-primary-foreground rounded-md",
                    today: "[&.rdp-day-today]:bg-accent [&.rdp-day-today]:text-accent-foreground rounded-md [&.rdp-day-today]:font-semibold",
                    outside: "opacity-30",
                    disabled: "opacity-30",
                    range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    hidden: "invisible",
                    ...classNames,
                }}
                {...props}
            />

            {/* Hint for scrolling */}
            <p className="text-xs text-muted-foreground/50 text-center mt-2">
                Прокрутите колесом для смены месяца
            </p>
        </div>
    );
}
Calendar.displayName = "Calendar"

export { Calendar }
