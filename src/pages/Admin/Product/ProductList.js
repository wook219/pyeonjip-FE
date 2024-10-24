import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axiosInstance';
import {toast} from "react-toastify"; // Axios 인스턴스 가져오기

function ProductList({ products, setProducts }) {
    const [categories, setCategories] = useState([]); // 카테고리 상태 추가
    const navigate = useNavigate();
    const BASE_URL = "https://dsrkzpzrzxqkarjw.tunnel-pt.elice.io";
    const token = localStorage.getItem('access'); // 저장된 JWT 토큰 가져오기

    // 카테고리 목록을 가져오는 함수
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(BASE_URL+'/api/admin/category', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`, // Authorization 헤더 추가
                    },
                });

                if (!response.ok) {
                    throw new Error('카테고리 불러오기 실패');
                }

                const data = await response.json(); // JSON 응답 파싱
                setCategories(data); // 자식 카테고리 목록 설정
                console.log("Fetched categories:", data);
            } catch (error) {
                console.error('카테고리 불러오기 실패:', error);
            }
        };

        fetchCategories();
    }, []);

    // 삭제 처리 함수
    const handleDelete = async (productId) => {
        const token = localStorage.getItem('token');
        if (window.confirm('정말로 이 상품을 삭제하시겠습니까?')) {
            try {
                // 상품 삭제 요청
                const deleteResponse = await fetch(BASE_URL+`/api/admin/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!deleteResponse.ok) {
                    throw new Error('상품 삭제 중 오류가 발생했습니다.');
                }

                toast.success('성공적으로 삭제되었습니다.', {
                    position: "top-center",
                    autoClose: 2000,
                });

                // 삭제 후 전체 상품 목록 다시 가져오기
                const productsResponse = await fetch(BASE_URL+'/api/products/all', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!productsResponse.ok) {
                    throw new Error('상품 목록을 불러오는 중 오류가 발생했습니다.');
                }

                const updatedProducts = await productsResponse.json();
                setProducts(updatedProducts); // 업데이트된 상품 목록으로 상태 설정

            } catch (error) {
                console.error('상품 삭제 중 오류가 발생했습니다:', error);
                toast.error('상품 삭제 중 오류가 발생했습니다.', {
                    position: "top-center",
                    autoClose: 2000,
                });
            }
        }
    };

    // 카테고리 ID에 해당하는 카테고리 이름을 가져오는 함수
    const getCategoryNameById = (categoryId) => {
        const category = categories.find(cat => cat.id === categoryId);
        return category ? category.name : '카테고리 없음'; // 카테고리가 없을 경우 기본 값
    };

    return (
        <div className="product-list card border-0">
            <h2 className="mb-4">상품 목록</h2>
            {products.length > 0 ? (
                <div>
                    <table className="table table-striped">
                        <thead>
                        <tr>
                            <th>이름</th>
                            <th>설명</th>
                            <th>카테고리 이름</th>
                            <th>작업</th>
                        </tr>
                        </thead>
                        <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name || 'N/A'}</td>
                                <td>{product.description || '설명 없음'}</td>
                                <td>{getCategoryNameById(product.categoryId)}</td>
                                <td>
                                    <button
                                        className="btn-dark-gray me-2"
                                        onClick={() => navigate(`/admin/edit-product/${product.id}`)}
                                    >
                                        수정
                                    </button>
                                    <button
                                        className="btn-dark-gray"
                                        onClick={() => handleDelete(product.id)}
                                    >
                                        삭제
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    <button
                        className="btn-black mt-3"
                        onClick={() => navigate('/admin/createproduct')}
                    >
                        상품 생성
                    </button>
                </div>
            ) : (
                <p className="text-muted">상품이 없습니다.</p>
            )}
        </div>
    );
}

export default ProductList;

