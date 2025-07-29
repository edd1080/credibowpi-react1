import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography, Button } from '../components/atoms';
import { AppShell } from '../components/organisms';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SolicitudesStackParamList } from '../navigation/SolicitudesStackNavigator';

type DetalleSolicitudScreenNavigationProp = StackNavigationProp<
    SolicitudesStackParamList,
    'DetalleSolicitud'
>;

type DetalleSolicitudScreenRouteProp = RouteProp<
    SolicitudesStackParamList,
    'DetalleSolicitud'
>;

interface DetalleSolicitudScreenProps {
    navigation: DetalleSolicitudScreenNavigationProp;
    route: DetalleSolicitudScreenRouteProp;
}

// Tipos para los datos
interface SolicitudData {
    id: string;
    clientName: string;
    status: string;
    progress: number;
    completedSections: number;
    totalSections: number;
}

interface DocumentData {
    name: string;
    status: string;
    icon: string;
}

// Mock data para las solicitudes
const mockSolicitudes: Record<string, SolicitudData> = {
    'SCP_834062': {
        id: 'SCP_834062',
        clientName: 'María González López',
        status: 'En Revisión',
        progress: 75,
        completedSections: 4,
        totalSections: 6,
    },
    'SCP_834063': {
        id: 'SCP_834063',
        clientName: 'Carlos Rodríguez Pérez',
        status: 'En Revisión',
        progress: 90,
        completedSections: 5,
        totalSections: 6,
    },
    'SCP_834064': {
        id: 'SCP_834064',
        clientName: 'Ana Patricia Morales',
        status: 'Aprobada',
        progress: 100,
        completedSections: 6,
        totalSections: 6,
    },
    'SCP_834065': {
        id: 'SCP_834065',
        clientName: 'Roberto Silva Castillo',
        status: 'Rechazada',
        progress: 45,
        completedSections: 3,
        totalSections: 6,
    },
};

// Datos base que se usan para todas las solicitudes
const baseData = {
    identification: {
        cedula: '1234567890',
        telefono: '+57 300 123 4567',
        email: 'cliente@email.com',
        fechaNacimiento: '15/03/1985',
        estadoCivil: 'Casada',
    },
    finances: {
        ingresosMensuales: '$2,500,000',
        egresosMensuales: '$1,800,000',
        patrimonio: '$45,000,000',
        deudas: '$8,500,000',
        capacidadPago: '$700,000',
        scoring: '720 - Bueno',
    },
    work: {
        empresa: 'Cooperativa Agrícola del Valle',
        cargo: 'Administradora',
        tiempoEmpleo: '5 años',
        tipoContrato: 'Indefinido',
        salario: '$2,500,000',
    },
    creditRequest: {
        monto: '$15,000,000',
        plazo: '24 meses',
        tipo: 'Crédito Agrícola',
        proposito: 'Compra de maquinaria agrícola',
    },
    documents: [
        { name: 'Cédula de Ciudadanía', status: 'Completo', icon: 'document-text' },
        { name: 'Certificado de Ingresos', status: 'Completo', icon: 'document-text' },
        { name: 'Referencias Comerciales', status: 'Pendiente', icon: 'document-text' },
        { name: 'Avalúo de Garantías', status: 'Completo', icon: 'document-text' },
        { name: 'Autorización Centrales', status: 'Pendiente', icon: 'document-text' },
    ] as DocumentData[],
};

type TabType = 'Resumen' | 'Detalles' | 'Fiadores' | 'Documentos';

const quickAccessSections = [
    { id: 'identification', label: 'Identificación', icon: 'person', color: '#E58FB1' },
    { id: 'finances', label: 'Finanzas', icon: 'card', color: colors.success },
    { id: 'location', label: 'Ubicación', icon: 'location', color: colors.warning },
    { id: 'guarantors', label: 'Fiadores', icon: 'people', color: colors.primary.cyan },
    { id: 'documents', label: 'Documentos', icon: 'folder', color: '#6E56CF' },
    { id: 'review', label: 'Revisión', icon: 'checkmark-circle', color: '#F76808' },
];

// Función para obtener el color de una sección
const getSectionColor = (sectionId: string) => {
    const section = quickAccessSections.find(s => s.id === sectionId);
    return section?.color || colors.primary.deepBlue;
};

export const DetalleSolicitudScreen: React.FC<DetalleSolicitudScreenProps> = ({
    route,
    navigation
}) => {
    const solicitudId = route.params.id;

    // Obtener datos de la solicitud específica
    const solicitudData = mockSolicitudes[solicitudId] || mockSolicitudes['SCP_834062'];
    const mockSolicitud = {
        ...solicitudData,
        ...baseData,
        identification: {
            ...baseData.identification,
            nombre: solicitudData?.clientName || 'Cliente',
        },
    };

    const [activeTab, setActiveTab] = useState<TabType>('Resumen');

    // Función para obtener el color del estado
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'aprobada':
                return colors.success;
            case 'rechazada':
                return colors.error;
            case 'en revisión':
                return colors.warning;
            case 'activa':
                return colors.primary.blue;
            default:
                return colors.neutral.gray500;
        }
    };

    // Función para obtener el color del progreso
    const getProgressColor = (progress: number) => {
        if (progress >= 100) return colors.success;
        if (progress >= 75) return colors.primary.blue;
        if (progress >= 50) return colors.warning;
        return colors.neutral.gray400;
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleEdit = () => {
        Alert.alert('Editar Solicitud', 'Función en desarrollo');
    };

    const handleSubmit = () => {
        if ((mockSolicitud.progress || 0) === 100) {
            Alert.alert('Enviar Solicitud', '¿Confirmas que deseas enviar esta solicitud?');
        } else {
            Alert.alert('Solicitud Incompleta', 'Completa todas las secciones antes de enviar');
        }
    };

    const handleQuickAccess = (sectionId: string) => {
        Alert.alert('Navegación', `Ir a sección: ${sectionId}`);
    };

    // Renderizar encabezado principal
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>

                <Typography variant="h3" color="primary" weight="medium">
                    {solicitudId}
                </Typography>

                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mockSolicitud.status || '') }]}>
                    <Typography variant="label" color="inverse" weight="medium">
                        {mockSolicitud.status || 'Sin estado'}
                    </Typography>
                </View>
            </View>
        </View>
    );

    // Renderizar migas de pan
    const renderBreadcrumbs = () => (
        <View style={styles.breadcrumbs}>
            <Typography variant="bodyS" color="secondary">
                Solicitudes &gt; {solicitudId}
            </Typography>
        </View>
    );

    // Renderizar información principal
    const renderMainInfo = () => (
        <View style={styles.mainInfo}>
            <Typography variant="h2" color="primary" weight="bold" style={styles.clientName}>
                {mockSolicitud.clientName}
            </Typography>

            <View style={styles.actionButtons}>
                <Button
                    title="Editar"
                    variant="secondary"
                    size="medium"
                    onPress={handleEdit}
                    style={styles.editButton}
                />

                <Button
                    title="Enviar Solicitud"
                    variant="primary"
                    size="medium"
                    onPress={handleSubmit}
                    disabled={(mockSolicitud.progress || 0) < 100}
                    style={styles.submitButton}
                />
            </View>
        </View>
    );

    // Renderizar barra de progreso
    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <Typography variant="bodyM" color="secondary" style={styles.progressText}>
                {mockSolicitud.completedSections || 0}/{mockSolicitud.totalSections || 6} secciones completadas
            </Typography>

            <View style={styles.progressTrack}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: `${mockSolicitud.progress || 0}%`,
                            backgroundColor: getProgressColor(mockSolicitud.progress || 0)
                        }
                    ]}
                />
            </View>
        </View>
    );

    // Renderizar acceso rápido
    const renderQuickAccess = () => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Feather name="file-text" size={20} color={colors.primary.deepBlue} />
                <Typography variant="bodyL" color="primary" weight="medium" style={styles.cardTitle}>
                    Acceso Rápido
                </Typography>
            </View>

            <View style={styles.quickAccessGrid}>
                {quickAccessSections.map((section) => (
                    <TouchableOpacity
                        key={section.id}
                        style={styles.quickAccessItem}
                        onPress={() => handleQuickAccess(section.id)}
                    >
                        <Ionicons name={section.icon as any} size={24} color={section.color} />
                        <Typography variant="caption" color="primary" weight="medium" style={styles.quickAccessLabel}>
                            {section.label}
                        </Typography>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    // Renderizar pestañas
    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <View style={styles.tabsHeader}>
                {(['Resumen', 'Detalles', 'Fiadores', 'Documentos'] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Typography
                            variant="bodyS"
                            color={activeTab === tab ? 'inverse' : 'secondary'}
                            weight={activeTab === tab ? 'medium' : 'regular'}
                        >
                            {tab}
                        </Typography>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.tabContent}>
                {renderTabContent()}
            </View>
        </View>
    );

    // Renderizar contenido de pestañas
    const renderTabContent = () => {
        switch (activeTab) {
            case 'Resumen':
                return renderResumenTab();
            case 'Detalles':
                return renderDetallesTab();
            case 'Fiadores':
                return renderFiadoresTab();
            case 'Documentos':
                return renderDocumentosTab();
            default:
                return null;
        }
    };

    // Renderizar pestaña de resumen
    const renderResumenTab = () => (
        <View style={styles.resumenContent}>
            {/* Tarjeta de Identificación */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="person" size={20} color={getSectionColor('identification')} />
                    <Typography variant="bodyL" color="primary" weight="medium" style={styles.cardTitle}>
                        Identificación
                    </Typography>
                </View>
                <View style={styles.fieldList}>
                    {Object.entries(mockSolicitud.identification).map(([key, value]) => (
                        <View key={key} style={styles.fieldRow}>
                            <Typography variant="bodyS" color="secondary" style={styles.fieldLabel}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}:
                            </Typography>
                            <Typography variant="bodyS" color="primary" weight="medium">
                                {String(value)}
                            </Typography>
                        </View>
                    ))}
                </View>
            </View>

            {/* Tarjeta de Finanzas */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="card" size={20} color={getSectionColor('finances')} />
                    <Typography variant="bodyL" color="primary" weight="medium" style={styles.cardTitle}>
                        Finanzas
                    </Typography>
                </View>
                <View style={styles.fieldList}>
                    {Object.entries(mockSolicitud.finances).map(([key, value]) => (
                        <View key={key} style={styles.fieldRow}>
                            <Typography variant="bodyS" color="secondary" style={styles.fieldLabel}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}:
                            </Typography>
                            <Typography variant="bodyS" color="primary" weight="medium">
                                {String(value)}
                            </Typography>
                        </View>
                    ))}
                </View>
            </View>

            {/* Tarjeta de Trabajo */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="briefcase" size={20} color={colors.warning} />
                    <Typography variant="bodyL" color="primary" weight="medium" style={styles.cardTitle}>
                        Trabajo
                    </Typography>
                </View>
                <View style={styles.fieldList}>
                    {Object.entries(mockSolicitud.work).map(([key, value]) => (
                        <View key={key} style={styles.fieldRow}>
                            <Typography variant="bodyS" color="secondary" style={styles.fieldLabel}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}:
                            </Typography>
                            <Typography variant="bodyS" color="primary" weight="medium">
                                {String(value)}
                            </Typography>
                        </View>
                    ))}
                </View>
            </View>

            {/* Tarjeta de Solicitud de Crédito */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="cash" size={20} color={colors.primary.deepBlue} />
                    <Typography variant="bodyL" color="primary" weight="medium" style={styles.cardTitle}>
                        Solicitud de Crédito
                    </Typography>
                </View>
                <View style={styles.creditGrid}>
                    {Object.entries(mockSolicitud.creditRequest).map(([key, value]) => (
                        <View key={key} style={styles.creditItem}>
                            <Typography variant="bodyS" color="secondary">
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Typography>
                            <Typography variant="bodyM" color="primary" weight="medium">
                                {String(value)}
                            </Typography>
                        </View>
                    ))}
                </View>
            </View>

            {/* Tarjeta de Estado de Documentos */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="folder" size={20} color={getSectionColor('documents')} />
                    <Typography variant="bodyL" color="primary" weight="medium" style={styles.cardTitle}>
                        Estado de Documentos
                    </Typography>
                </View>
                <View style={styles.documentsList}>
                    {mockSolicitud.documents.map((doc: DocumentData, index: number) => (
                        <View key={index} style={styles.documentRow}>
                            <View style={styles.documentInfo}>
                                <Ionicons name={doc.icon as any} size={16} color={colors.text.secondary} />
                                <Typography variant="bodyS" color="primary" style={styles.documentName}>
                                    {doc.name}
                                </Typography>
                            </View>
                            <View style={[
                                styles.documentStatus,
                                { backgroundColor: doc.status === 'Completo' ? colors.success : colors.warning }
                            ]}>
                                <Typography variant="caption" color="inverse" weight="medium">
                                    {doc.status}
                                </Typography>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    // Renderizar pestañas en desarrollo
    const renderDetallesTab = () => (
        <View style={styles.developmentTab}>
            <Typography variant="bodyM" color="secondary">
                Pestaña "Detalles" en desarrollo
            </Typography>
        </View>
    );

    const renderFiadoresTab = () => (
        <View style={styles.developmentTab}>
            <Typography variant="bodyM" color="secondary">
                Pestaña "Fiadores" en desarrollo
            </Typography>
        </View>
    );

    const renderDocumentosTab = () => (
        <View style={styles.developmentTab}>
            <Typography variant="bodyM" color="secondary">
                Pestaña "Documentos" en desarrollo
            </Typography>
        </View>
    );

    return (
        <AppShell>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {renderHeader()}
                {renderBreadcrumbs()}
                {renderMainInfo()}
                {renderProgressBar()}
                {renderQuickAccess()}
                {renderTabs()}
            </ScrollView>
        </AppShell>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.app,
    },

    content: {
        paddingHorizontal: spacing.space24,
        paddingVertical: spacing.space16,
    },

    header: {
        marginBottom: spacing.space16,
    },

    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    backButton: {
        padding: spacing.space8,
        marginLeft: -spacing.space8,
    },

    statusBadge: {
        paddingHorizontal: spacing.space12,
        paddingVertical: spacing.space4,
        borderRadius: spacing.borderRadius.full,
    },

    breadcrumbs: {
        marginBottom: spacing.space16,
    },

    mainInfo: {
        marginBottom: spacing.space24,
    },

    clientName: {
        marginBottom: spacing.space16,
    },

    actionButtons: {
        flexDirection: 'row',
        gap: spacing.space12,
    },

    editButton: {
        flex: 1,
    },

    submitButton: {
        flex: 1,
    },

    progressContainer: {
        marginBottom: spacing.space24,
    },

    progressText: {
        marginBottom: spacing.space8,
    },

    progressTrack: {
        height: 8,
        backgroundColor: colors.neutral.gray200,
        borderRadius: spacing.borderRadius.sm,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        borderRadius: spacing.borderRadius.sm,
    },

    card: {
        backgroundColor: colors.background.primary,
        padding: spacing.space20,
        borderRadius: spacing.borderRadius.xl,
        marginBottom: spacing.space16,
        shadowColor: colors.text.primary,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.space16,
    },

    cardTitle: {
        marginLeft: spacing.space8,
    },

    quickAccessGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: spacing.space12,
    },

    quickAccessItem: {
        width: '30%',
        alignItems: 'center',
        padding: spacing.space12,
        backgroundColor: colors.background.secondary,
        borderRadius: spacing.borderRadius.lg,
    },

    quickAccessLabel: {
        marginTop: spacing.space8,
        textAlign: 'center',
    },

    tabsContainer: {
        marginBottom: spacing.space32,
    },

    tabsHeader: {
        flexDirection: 'row',
        backgroundColor: colors.background.primary,
        borderRadius: spacing.borderRadius.lg,
        padding: spacing.space4,
        marginBottom: spacing.space16,
    },

    tab: {
        flex: 1,
        paddingVertical: spacing.space12,
        alignItems: 'center',
        borderRadius: spacing.borderRadius.md,
    },

    activeTab: {
        backgroundColor: colors.primary.deepBlue,
    },

    tabContent: {
        minHeight: 200,
    },

    resumenContent: {
        gap: spacing.space16,
    },

    fieldList: {
        gap: spacing.space12,
    },

    fieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    fieldLabel: {
        flex: 1,
    },

    creditGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: spacing.space16,
    },

    creditItem: {
        width: '48%',
    },

    documentsList: {
        gap: spacing.space12,
    },

    documentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    documentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    documentName: {
        marginLeft: spacing.space8,
    },

    documentStatus: {
        paddingHorizontal: spacing.space8,
        paddingVertical: spacing.space4,
        borderRadius: spacing.borderRadius.sm,
    },

    developmentTab: {
        padding: spacing.space32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});