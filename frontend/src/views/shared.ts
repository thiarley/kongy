/**
 * Shared utilities for views
 */

// Confirmation dialog using SweetAlert
export async function confirmAction(
    title: string,
    text: string = '',
    icon: 'warning' | 'error' | 'question' = 'warning'
): Promise<boolean> {
    // @ts-ignore - Swal is global
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, confirmar!',
        cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
}
