import React, { useState } from 'react';
import { Modal, Pressable, Text, View, FlatList } from 'react-native';

type Option = {
    label: string;
    value: string;
};

type DropdownProps = {
    options: Option[];
    selectedValue: string;
    onValueChange: (value: string) => void;
};

export const CustomDropdown: React.FC<DropdownProps> = ({
    options,
    selectedValue,
    onValueChange,
}) => {
    const [visible, setVisible] = useState(false);

    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || 'Select an option';

    return (
        <View className="w-full">
            {/* Main button */}
            <Pressable
                onPress={() => setVisible(true)}
                className="border border-gray-300 rounded-xl p-3 bg-white"
            >
                <Text className="text-gray-800">{selectedLabel}</Text>
            </Pressable>

            {/* Dropdown modal */}
            <Modal transparent visible={visible} animationType="fade">
                <Pressable
                    onPress={() => setVisible(false)}
                    className="flex-1 bg-black/50 justify-center items-center"
                >
                    <View className="bg-white rounded-2xl w-3/4 max-h-80 p-4">
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => {
                                        onValueChange(item.value);
                                        setVisible(false);
                                    }}
                                    className="p-3 rounded-lg hover:bg-gray-100"
                                >
                                    <Text className="text-gray-800">{item.label}</Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};
