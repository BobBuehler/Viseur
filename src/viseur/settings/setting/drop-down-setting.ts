import { Event } from "src/core/event";
import { DropDown, IDropDownArgs } from "src/core/ui/inputs/drop-down";
import { BaseSetting } from "./base-setting";

export class DropDownSetting<T> extends BaseSetting {
    /** This event is emitted when the value of the setting changes */
    public readonly changed = new Event<T>();

    constructor(args: IDropDownArgs<T> & {
        /** The default value for the drop down, must be a valid option */
        default: T,
    }) {
        super(args, DropDown);
    }

    /**
     * Gets the value of the setting
     * both are basically the id so that multiple games (namespaces) can have the same settings key.
     * @param [defaultValue=null] the default value, if there is not setting
     *                                for namespace.key then it is set to def, and returned
     * @returns whatever was stored at this setting
     */
    public get(defaultValue?: T): T {
        return super.get(arguments.length === 0
            ? null
            : defaultValue,
        );
    }

    /**
     * Sets the value of this setting
     * @param  value the new value to store for this setting
     */
    public set(value: T): void {
        super.set(value);
    }
}
