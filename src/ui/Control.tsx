import * as React from 'react';
import { observer } from 'mobx-react';
import { Field } from '../Field';

import { INormalizedFieldDefinition, IFieldDefinition, fieldValue } from '../interfaces/Form';
import { omit } from '../utils';
import BaseControl from './BaseControl';
import { withForm, withParentName } from '../context';
import { IControlProps } from '../interfaces/Control';

// todo: probably may be used when implementing withRef
/*const isClassComponent = Component => Boolean(
  Component &&
  Component.prototype &&
  typeof Component.prototype.isReactComponent === 'object'
)*/

// todo: add value property to make field a controlled component

@observer
class Control extends BaseControl<IControlProps> {
	public field: Field;

	private isNumber: boolean;
	private isSelect: boolean;
	private isCheckable: boolean;
	private isFile: boolean;
	private isRadio: boolean;
	private isCheckbox: boolean;

	public static defaultProps = {
		rules: ''
	};

	public static normalizeFieldDefinition(fieldDefinition: IFieldDefinition): INormalizedFieldDefinition {
		if (Array.isArray(fieldDefinition)) {
			return (fieldDefinition.length === 2) ? (fieldDefinition as [fieldValue, string]) : [fieldDefinition[0], ''];
		}

		return [fieldDefinition, ''];
	}

	private static requiredProps: string[] = ['component', 'name'];
	public static skipProp: string[] = ['component', 'rules', 'className'];

	constructor(props) {
		const isRadio = props.type === 'radio';
		super(props, [...Control.requiredProps, ...(isRadio ? ['value'] : [])]);

		this.isRadio     = isRadio;
		this.isCheckbox  = props.type      === 'checkbox';
		this.isFile      = props.type      === 'file';
		this.isNumber    = props.type      === 'number';
		this.isSelect    = props.component === 'select';
		this.isCheckable = this.isCheckbox || this.isRadio;

		this.onChange = this.onChange.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onBlur = this.onBlur.bind(this);

		// we assume, that there can be several controls in form connected with on field instance in form
		// so before field creation - we check for existance of field with this name
		// this is useful in radiobutton case
		this.field = this.form.getField(this.state.name) as Field;

		if (!this.field) {
			this.createField();
			this.field.subscribeToFormValidation(this.form);
		}
	}

	private createField(): void {
		const fieldDefinition = this.prepareFieldDefinition(this.state.name, this.props.rules);

		this.warnOnIncorrectInitialValues(fieldDefinition[0]);

		this.field = new Field(this.state.name, fieldDefinition);
		this.form.registerField(this.field);
	}

	public componentWillUnmount(): void {
		if (!this.field.autoRemove && this.props.__formContext.destroyControlStateOnUnmount) {
			this.form.unregisterField(this.state.name);
		}
	}

 public componentDidUpdate(prevProps: IControlProps) {
		if (this.field.name !== this.state.name || prevProps.rules !== this.props.rules) {
			const fieldDefinition = this.prepareFieldDefinition(this.state.name, this.props.rules);

			this.field.update(this.state.name, fieldDefinition);
		}
	}

	private prepareFieldDefinition(name: string, rules: string): INormalizedFieldDefinition {
		if (this.form.formSchema[name]) {
			// normalize field definition from initial form schema
			return Control.normalizeFieldDefinition(this.form.formSchema[name]);
		}

		return [this.isCheckbox ? false : '', rules];
	}

	private warnOnIncorrectInitialValues(initialValue: fieldValue): void {
		const initialValueType = typeof initialValue; // initial value

		if (this.isSelect) {
			// todo: verify options to match select value
		}

		if (
			(this.isCheckbox && initialValueType !== 'boolean') ||
			(this.isNumber && initialValueType !== 'number') ||
			(!this.isCheckbox && !this.isNumber && initialValueType !== 'string')
		) {
			// tslint:disable-next-line
			console.warn(`Incorrect initial value provided to field '${this.state.name}'. Got '${initialValueType}'`)
		}
	}

	private onChange(event): void {
		let value;

		if (this.isCheckbox) {
			// checkboxes may have(not) a value property that corresponds to true value
			value = (event.target.checked && this.props.value) ? event.target.value : event.target.checked;
		}
		else if (this.isFile) {
			value = event.target.files;
		}
		else {
			value = event.target.value;
		}

		this.field.onChange(value);

		if (this.props.onChange) {
			this.props.onChange(event);
		}
	}

	private onFocus(event): void {
		this.field.onFocus();

		if (this.props.onFocus) {
			this.props.onFocus(event);
		}
	}

	private onBlur(event): void {
		this.field.onBlur();

		if (this.props.onBlur) {
			this.props.onBlur(event);
		}
	}

	public render() {
		console.log(`render ${this.props.name}`);
		// todo: implement withRef today
		const handlers = {
			onChange: this.onChange,
			onFocus: this.onFocus,
			onBlur: this.onBlur
		};

		const inputValue = {
			value: (this.isCheckable && this.props.value) ? this.props.value : (this.field.value as string)
		};

		const inputChecked = {
			checked: {}
		};

		if (this.isCheckbox) {
			inputChecked.checked = !!this.field.value;
		}
		else if (this.isRadio) {
			inputChecked.checked = this.field.value === this.props.value;
		}

		const meta = {
			focused: this.field.isFocused,
			touched: this.field.isTouched,
			dirty  : this.field.isDirty,
			valid  : this.field.isValid,
			errors : this.field.errors
		};

		const className = [
			this.props.className,
			meta.touched ? 'rmf-touched' : 'rmf-untouched',
			meta.dirty   ? 'rmf-dirty'   : 'rmf-pristine',
			meta.valid   ? 'rmf-valid'   : 'rmf-invalid'
		].join(' ');

		const input = Object.assign(
			{},
			{ className },
			// input type file, and checkbox without value should not have this attribute
			((this.isFile || (this.isCheckbox && !this.props.value)) ? {} : inputValue),
			handlers,
			(this.isCheckable ? inputChecked : {})
		);

		const propsToPass = omit(this.props, [...BaseControl.skipProp, ...Control.skipProp]);

		if (typeof this.props.component === 'function') {
			return React.createElement(this.props.component, Object.assign({}, { input }, { meta }, propsToPass));
		}

		if (this.props.component === 'select') {
			return <select {...input} {...propsToPass}>{this.props.children}</select>;
		}

		// input with text, checkbox, radio, email, number, password type or textarea
		return React.createElement(this.props.component as string, Object.assign({}, input, propsToPass));
	}
}

// tslint:disable-next-line: variable-name
export const ControlWithContext = withParentName(withForm(Control));
