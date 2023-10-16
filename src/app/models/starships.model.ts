export interface StarshipDetails {
    model?: string,
    starship_class?: string,
    manufacturer?: string
    cost_in_credits?: number,
    length?: number,
    crew: string | 'unknown',
    passengers?: number,
    max_atmosphering_speed?: number,
    hyperdrive_rating?: number,
    MGLT?: number,
    cargo_capacity?: number,
    consumables?: string,
    pilots?: [],
    name?: string,
    image?: string; 
    url?: string
}