import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Modal } from '../../components/ui/Modal';

interface CarouselItem {
    id: string;
    titre: string;
    description: string | null;
    image_url: string;
    lien: string | null;
    active: boolean;
    ordre: number;
}

export function ManageCarouselPage() {
    const [items, setItems] = useState<CarouselItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<CarouselItem> | null>(null);

    // Form states
    const [titre, setTitre] = useState('');
    const [description, setDescription] = useState('');
    const [lien, setLien] = useState('');
    const [active, setActive] = useState(true);
    const [ordre, setOrdre] = useState(0);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('infos_carrousel')
                .select('*')
                .order('ordre', { ascending: true });
            if (error) throw error;
            setItems(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleOpenModal = (item: Partial<CarouselItem> | null = null) => {
        setCurrentItem(item);
        setTitre(item?.titre || '');
        setDescription(item?.description || '');
        setLien(item?.lien || '');
        setActive(item?.active ?? true);
        setOrdre(item?.ordre || 0);
        setPreviewUrl(item?.image_url || null);
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
        setTitre('');
        setDescription('');
        setLien('');
        setActive(true);
        setOrdre(0);
        setImageFile(null);
        setPreviewUrl(null);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `carousel/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!titre) return;
        if (!currentItem?.id && !imageFile) {
            setError("Une image est requise pour un nouvel élément.");
            return;
        }

        setUploading(true);
        try {
            let imageUrl = currentItem?.image_url;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            if (!imageUrl) throw new Error("Erreur lors du traitement de l'image.");

            const itemData = {
                titre,
                description,
                lien,
                active,
                ordre,
                image_url: imageUrl
            };

            let result;
            if (currentItem?.id) {
                // Mise à jour
                result = await supabase
                    .from('infos_carrousel')
                    .update(itemData)
                    .eq('id', currentItem.id)
                    .select()
                    .single();
            } else {
                // Création
                result = await supabase
                    .from('infos_carrousel')
                    .insert(itemData)
                    .select()
                    .single();
            }

            const { error: submissionError } = result;
            if (submissionError) throw submissionError;

            await fetchItems();
            handleCloseModal();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
            try {
                const { error } = await supabase.from('infos_carrousel').delete().eq('id', itemId);
                if (error) throw error;
                setItems(items.filter(i => i.id !== itemId));
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    if (loading) return <div className="p-4">Chargement...</div>;
    if (error) return <div className="p-4 text-red-500">Erreur: {error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer le Carrousel</h1>
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="bg-blue-500 text-white p-2 rounded-lg flex items-center hover:bg-blue-600 transition-colors">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un élément
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <img src={item.image_url} alt={item.titre} className="h-12 w-20 object-cover rounded" />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.titre}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.ordre}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.active ? 'Actif' : 'Inactif'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[100px]">
                                    <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentItem?.id ? 'Modifier l\'élément' : 'Ajouter un élément'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Titre</label>
                        <input
                            type="text"
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Lien (Optionnel)</label>
                        <input
                            type="text"
                            value={lien}
                            onChange={(e) => setLien(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ordre</label>
                            <input
                                type="number"
                                value={ordre}
                                onChange={(e) => setOrdre(parseInt(e.target.value))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <input
                                type="checkbox"
                                id="active"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                                Actif
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Image</label>
                        <div className="mt-1 flex items-center space-x-4">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="h-20 w-32 object-cover rounded border border-gray-300" />
                            ) : (
                                <div className="h-20 w-32 bg-gray-100 rounded border border-gray-300 flex items-center justify-center text-gray-400">
                                    <PhotoIcon className="h-8 w-8" />
                                </div>
                            )}
                            <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <span>Changer</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Dimensions recommandées : 1920 x 400 pixels (Format panoramique)</p>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {uploading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {currentItem?.id ? 'Enregistrer' : 'Créer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
