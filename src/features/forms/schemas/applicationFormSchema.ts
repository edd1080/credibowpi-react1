// Application form schema definition
// This defines the complete structure for credit application forms

import { FormSchema } from '../types';

export const applicationFormSchema: FormSchema = {
  id: 'credit-application',
  name: 'Credit Application Form',
  title: 'Solicitud de Crédito',
  description: 'Formulario completo para solicitud de crédito',
  version: '1.0.0',
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  sections: [
    {
      id: 'identification',
      name: 'identification',
      title: 'Identificación',
      description: 'Información personal del solicitante',
      icon: 'person',
      order: 1,
      required: true,
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'Nombres',
          type: 'text',
          placeholder: 'Ingrese sus nombres',
          required: true,
          section: 'identification',
          order: 1,
          validations: [
            {
              rule: 'required',
              message: 'Los nombres son requeridos'
            },
            {
              rule: 'minLength',
              value: 2,
              message: 'Los nombres deben tener al menos 2 caracteres'
            },
            {
              rule: 'maxLength',
              value: 50,
              message: 'Los nombres no pueden exceder 50 caracteres'
            }
          ]
        },
        {
          id: 'lastName',
          name: 'lastName',
          label: 'Apellidos',
          type: 'text',
          placeholder: 'Ingrese sus apellidos',
          required: true,
          section: 'identification',
          order: 2,
          validations: [
            {
              rule: 'required',
              message: 'Los apellidos son requeridos'
            },
            {
              rule: 'minLength',
              value: 2,
              message: 'Los apellidos deben tener al menos 2 caracteres'
            },
            {
              rule: 'maxLength',
              value: 50,
              message: 'Los apellidos no pueden exceder 50 caracteres'
            }
          ]
        },
        {
          id: 'dpi',
          name: 'dpi',
          label: 'DPI',
          type: 'text',
          placeholder: '0000 00000 0000',
          required: true,
          section: 'identification',
          order: 3,
          validations: [
            {
              rule: 'required',
              message: 'El DPI es requerido'
            },
            {
              rule: 'pattern',
              value: '^[0-9]{4}\\s?[0-9]{5}\\s?[0-9]{4}$',
              message: 'Formato de DPI inválido'
            }
          ]
        },
        {
          id: 'birthDate',
          name: 'birthDate',
          label: 'Fecha de Nacimiento',
          type: 'date',
          required: true,
          section: 'identification',
          order: 4,
          validations: [
            {
              rule: 'required',
              message: 'La fecha de nacimiento es requerida'
            }
          ]
        },
        {
          id: 'nationality',
          name: 'nationality',
          label: 'Nacionalidad',
          type: 'select',
          required: true,
          section: 'identification',
          order: 5,
          defaultValue: 'guatemalteca',
          options: [
            { label: 'Guatemalteca', value: 'guatemalteca' },
            { label: 'Extranjera', value: 'extranjera' }
          ],
          validations: [
            {
              rule: 'required',
              message: 'La nacionalidad es requerida'
            }
          ]
        },
        {
          id: 'maritalStatus',
          name: 'maritalStatus',
          label: 'Estado Civil',
          type: 'select',
          required: true,
          section: 'identification',
          order: 6,
          options: [
            { label: 'Soltero/a', value: 'single' },
            { label: 'Casado/a', value: 'married' },
            { label: 'Divorciado/a', value: 'divorced' },
            { label: 'Viudo/a', value: 'widowed' },
            { label: 'Unión de Hecho', value: 'common_law' }
          ],
          validations: [
            {
              rule: 'required',
              message: 'El estado civil es requerido'
            }
          ]
        },
        {
          id: 'phone',
          name: 'phone',
          label: 'Teléfono',
          type: 'phone',
          placeholder: '0000-0000',
          required: true,
          section: 'identification',
          order: 7,
          validations: [
            {
              rule: 'required',
              message: 'El teléfono es requerido'
            },
            {
              rule: 'phone',
              message: 'Formato de teléfono inválido'
            }
          ]
        },
        {
          id: 'email',
          name: 'email',
          label: 'Correo Electrónico',
          type: 'email',
          placeholder: 'ejemplo@correo.com',
          required: false,
          section: 'identification',
          order: 8,
          validations: [
            {
              rule: 'email',
              message: 'Formato de correo electrónico inválido'
            }
          ]
        }
      ]
    },
    {
      id: 'address',
      name: 'address',
      title: 'Dirección',
      description: 'Información de residencia',
      icon: 'location',
      order: 2,
      required: true,
      fields: [
        {
          id: 'street',
          name: 'street',
          label: 'Dirección',
          type: 'textarea',
          placeholder: 'Ingrese su dirección completa',
          required: true,
          section: 'address',
          order: 1,
          validations: [
            {
              rule: 'required',
              message: 'La dirección es requerida'
            },
            {
              rule: 'minLength',
              value: 10,
              message: 'La dirección debe tener al menos 10 caracteres'
            }
          ]
        },
        {
          id: 'city',
          name: 'city',
          label: 'Municipio',
          type: 'text',
          placeholder: 'Ingrese el municipio',
          required: true,
          section: 'address',
          order: 2,
          validations: [
            {
              rule: 'required',
              message: 'El municipio es requerido'
            }
          ]
        },
        {
          id: 'department',
          name: 'department',
          label: 'Departamento',
          type: 'select',
          required: true,
          section: 'address',
          order: 3,
          options: [
            { label: 'Guatemala', value: 'guatemala' },
            { label: 'Sacatepéquez', value: 'sacatepequez' },
            { label: 'Chimaltenango', value: 'chimaltenango' },
            { label: 'El Progreso', value: 'el_progreso' },
            { label: 'Escuintla', value: 'escuintla' },
            { label: 'Santa Rosa', value: 'santa_rosa' },
            { label: 'Sololá', value: 'solola' },
            { label: 'Totonicapán', value: 'totonicapan' },
            { label: 'Quetzaltenango', value: 'quetzaltenango' },
            { label: 'Suchitepéquez', value: 'suchitepequez' },
            { label: 'Retalhuleu', value: 'retalhuleu' },
            { label: 'San Marcos', value: 'san_marcos' },
            { label: 'Huehuetenango', value: 'huehuetenango' },
            { label: 'Quiché', value: 'quiche' },
            { label: 'Baja Verapaz', value: 'baja_verapaz' },
            { label: 'Alta Verapaz', value: 'alta_verapaz' },
            { label: 'Petén', value: 'peten' },
            { label: 'Izabal', value: 'izabal' },
            { label: 'Zacapa', value: 'zacapa' },
            { label: 'Chiquimula', value: 'chiquimula' },
            { label: 'Jalapa', value: 'jalapa' },
            { label: 'Jutiapa', value: 'jutiapa' }
          ],
          validations: [
            {
              rule: 'required',
              message: 'El departamento es requerido'
            }
          ]
        },
        {
          id: 'postalCode',
          name: 'postalCode',
          label: 'Código Postal',
          type: 'text',
          placeholder: '00000',
          required: false,
          section: 'address',
          order: 4,
          validations: [
            {
              rule: 'pattern',
              value: '^[0-9]{5}$',
              message: 'El código postal debe tener 5 dígitos'
            }
          ]
        }
      ]
    },
    {
      id: 'finances',
      name: 'finances',
      title: 'Información Financiera',
      description: 'Ingresos, gastos y patrimonio',
      icon: 'money',
      order: 3,
      required: true,
      fields: [
        {
          id: 'monthlyIncome',
          name: 'monthlyIncome',
          label: 'Ingresos Mensuales',
          type: 'currency',
          placeholder: 'Q 0.00',
          required: true,
          section: 'finances',
          order: 1,
          validations: [
            {
              rule: 'required',
              message: 'Los ingresos mensuales son requeridos'
            },
            {
              rule: 'min',
              value: 0,
              message: 'Los ingresos no pueden ser negativos'
            }
          ]
        },
        {
          id: 'monthlyExpenses',
          name: 'monthlyExpenses',
          label: 'Gastos Mensuales',
          type: 'currency',
          placeholder: 'Q 0.00',
          required: true,
          section: 'finances',
          order: 2,
          validations: [
            {
              rule: 'required',
              message: 'Los gastos mensuales son requeridos'
            },
            {
              rule: 'min',
              value: 0,
              message: 'Los gastos no pueden ser negativos'
            }
          ]
        },
        {
          id: 'hasOtherDebts',
          name: 'hasOtherDebts',
          label: '¿Tiene otras deudas?',
          type: 'radio',
          required: true,
          section: 'finances',
          order: 3,
          options: [
            { label: 'Sí', value: 'yes' },
            { label: 'No', value: 'no' }
          ],
          validations: [
            {
              rule: 'required',
              message: 'Debe indicar si tiene otras deudas'
            }
          ]
        },
        {
          id: 'otherDebtsAmount',
          name: 'otherDebtsAmount',
          label: 'Monto de Otras Deudas',
          type: 'currency',
          placeholder: 'Q 0.00',
          required: false,
          section: 'finances',
          order: 4,
          conditionalLogic: [
            {
              field: 'hasOtherDebts',
              operator: 'equals',
              value: 'yes',
              action: 'show'
            },
            {
              field: 'hasOtherDebts',
              operator: 'equals',
              value: 'yes',
              action: 'require'
            }
          ],
          validations: [
            {
              rule: 'min',
              value: 0,
              message: 'El monto no puede ser negativo'
            }
          ]
        }
      ]
    },
    {
      id: 'business',
      name: 'business',
      title: 'Información Laboral',
      description: 'Trabajo y actividad económica',
      icon: 'work',
      order: 4,
      required: true,
      fields: [
        {
          id: 'employmentType',
          name: 'employmentType',
          label: 'Tipo de Empleo',
          type: 'select',
          required: true,
          section: 'business',
          order: 1,
          options: [
            { label: 'Empleado', value: 'employed' },
            { label: 'Trabajador Independiente', value: 'self_employed' },
            { label: 'Propietario de Negocio', value: 'business_owner' },
            { label: 'Desempleado', value: 'unemployed' }
          ],
          validations: [
            {
              rule: 'required',
              message: 'El tipo de empleo es requerido'
            }
          ]
        },
        {
          id: 'companyName',
          name: 'companyName',
          label: 'Nombre de la Empresa',
          type: 'text',
          placeholder: 'Ingrese el nombre de la empresa',
          required: false,
          section: 'business',
          order: 2,
          conditionalLogic: [
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'employed',
              action: 'show'
            },
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'employed',
              action: 'require'
            }
          ]
        },
        {
          id: 'position',
          name: 'position',
          label: 'Cargo/Posición',
          type: 'text',
          placeholder: 'Ingrese su cargo',
          required: false,
          section: 'business',
          order: 3,
          conditionalLogic: [
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'employed',
              action: 'show'
            },
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'employed',
              action: 'require'
            }
          ]
        },
        {
          id: 'businessType',
          name: 'businessType',
          label: 'Tipo de Negocio',
          type: 'text',
          placeholder: 'Ej: Tienda, Restaurante, Servicios',
          required: false,
          section: 'business',
          order: 4,
          conditionalLogic: [
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'business_owner',
              action: 'show'
            },
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'self_employed',
              action: 'show'
            }
          ]
        },
        {
          id: 'yearsInBusiness',
          name: 'yearsInBusiness',
          label: 'Años en el Negocio',
          type: 'number',
          placeholder: '0',
          required: false,
          section: 'business',
          order: 5,
          conditionalLogic: [
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'business_owner',
              action: 'show'
            },
            {
              field: 'employmentType',
              operator: 'equals',
              value: 'self_employed',
              action: 'show'
            }
          ],
          validations: [
            {
              rule: 'min',
              value: 0,
              message: 'Los años no pueden ser negativos'
            },
            {
              rule: 'max',
              value: 50,
              message: 'Los años no pueden exceder 50'
            }
          ]
        }
      ]
    }
  ]
};